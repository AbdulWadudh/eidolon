export function formatClockTime(when: Date = new Date()): string {
  const hours = when.getHours();
  const minutes = when.getMinutes();
  const suffix = hours < 12 ? "AM" : "PM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(seconds: number | null): string {
  const whole = wholeSeconds(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatVoiceDuration(seconds: number | null): string {
  const whole = wholeSeconds(seconds);
  if (whole < 60) return `${whole}"`;
  return `${Math.floor(whole / 60)}'${String(whole % 60).padStart(2, "0")}"`;
}

function wholeSeconds(seconds: number | null): number {
  const safe = Number.isFinite(seconds) && seconds !== null ? Math.max(0, seconds) : 0;
  return Math.round(safe);
}
