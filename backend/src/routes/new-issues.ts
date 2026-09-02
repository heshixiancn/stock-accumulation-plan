import { Router } from "express";
import {
  createNewIssue,
  deleteNewIssueById,
  listNewIssues,
  updateNewIssueById,
} from "../services/new-issue-service.js";
import { newIssuePayloadSchema } from "../services/validation.js";

export const newIssuesRouter = Router();

newIssuesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listNewIssues());
  } catch (error) {
    next(error);
  }
});

newIssuesRouter.post("/", async (req, res, next) => {
  try {
    const payload = newIssuePayloadSchema.parse(req.body);
    await createNewIssue(payload);
    res.status(201).json({ message: "created" });
  } catch (error) {
    next(error);
  }
});

newIssuesRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = newIssuePayloadSchema.parse(req.body);
    await updateNewIssueById(req.params.id, payload);
    res.json({ message: "updated" });
  } catch (error) {
    next(error);
  }
});

newIssuesRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteNewIssueById(req.params.id);
    res.json({ message: "deleted" });
  } catch (error) {
    next(error);
  }
});
