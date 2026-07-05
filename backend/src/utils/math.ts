export const roundTo = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const safeDivide = (numerator: number, denominator: number): number => {
  if (!denominator) return 0;
  return numerator / denominator;
};

export const percentage = (numerator: number, denominator: number): number => {
  return roundTo(safeDivide(numerator, denominator) * 100, 2);
};

