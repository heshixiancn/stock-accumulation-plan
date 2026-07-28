import net from "node:net";
import tls from "node:tls";
import { once } from "node:events";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

interface MailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

const CRLF = "\r\n";

const encodeHeader = (value: string) => `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

const dotStuff = (value: string) => value.replace(/\r?\n/g, CRLF).replace(/^\./gm, "..");

const readResponse = async (socket: net.Socket) => {
  let buffer = "";

  while (true) {
    const [chunk] = (await once(socket, "data")) as [Buffer];
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    const last = lines.at(-1);

    if (last && /^\d{3} /.test(last)) {
      const code = Number(last.slice(0, 3));
      return { code, message: buffer.trim() };
    }
  }
};

const writeCommand = async (socket: net.Socket, command: string, expectedCodes: number[]) => {
  socket.write(`${command}${CRLF}`);
  const response = await readResponse(socket);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed: ${command}; ${response.message}`);
  }

  return response;
};

const connectSocket = async (config: SmtpConfig): Promise<net.Socket> => {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });

  await once(socket, "connect");
  const greeting = await readResponse(socket);
  if (greeting.code !== 220) {
    throw new Error(`SMTP greeting failed: ${greeting.message}`);
  }

  return socket;
};

const upgradeToTls = async (socket: net.Socket, config: SmtpConfig): Promise<tls.TLSSocket> =>
  new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: config.host,
    });
    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });

export const sendMail = async (config: SmtpConfig, message: MailMessage) => {
  let socket = await connectSocket(config);

  try {
    await writeCommand(socket, `EHLO ${config.host}`, [250]);

    if (!config.secure && config.port === 587) {
      await writeCommand(socket, "STARTTLS", [220]);
      socket = await upgradeToTls(socket, config);
      await writeCommand(socket, `EHLO ${config.host}`, [250]);
    }

    if (config.user || config.password) {
      const auth = Buffer.from(`\0${config.user}\0${config.password}`, "utf8").toString("base64");
      await writeCommand(socket, `AUTH PLAIN ${auth}`, [235]);
    }

    await writeCommand(socket, `MAIL FROM:<${message.from}>`, [250]);
    for (const recipient of message.to) {
      await writeCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    }
    await writeCommand(socket, "DATA", [354]);

    const boundary = `stock-report-${Date.now()}`;
    const body = [
      `From: <${message.from}>`,
      `To: ${message.to.map((recipient) => `<${recipient}>`).join(", ")}`,
      `Subject: ${encodeHeader(message.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.text,
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.html,
      `--${boundary}--`,
      "",
    ].join(CRLF);

    socket.write(`${dotStuff(body)}${CRLF}.${CRLF}`);
    const sent = await readResponse(socket);
    if (sent.code !== 250) {
      throw new Error(`SMTP send failed: ${sent.message}`);
    }

    await writeCommand(socket, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
};
