export const getEffectiveDividendPerShare = (
  currentPrice: number,
  dividendYield: number,
  dividendPerShare: number,
): number => {
  if (dividendPerShare > 0) return dividendPerShare;
  if (currentPrice > 0 && dividendYield > 0) return currentPrice * dividendYield;
  return 0;
};
