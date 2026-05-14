
export function timeToHour(time: string): number {
  const [h] = time.split(":").map(Number);
  return h;
}

export function durationHours(start: string, end: string): number {
  const [h1] = start.split(":").map(Number);
  const [h2] = end.split(":").map(Number);
  return h2 - h1;
}
