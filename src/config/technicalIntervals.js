export function getTechnicalIntervals() {
  const value = process.env.TECHNICAL_INTERVALS;

  if (!value) {
    throw new Error(
      "TECHNICAL_INTERVALS is required"
    );
  }

  const intervals = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!intervals.length) {
    throw new Error(
      "TECHNICAL_INTERVALS must contain at least one interval"
    );
  }

  return intervals;
}