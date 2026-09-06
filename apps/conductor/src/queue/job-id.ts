const UNSAFE_IN_JOB_ID = /[^a-zA-Z0-9_-]+/g;

export function jobKey(...parts: (string | number)[]): string {
  return parts.map((part) => String(part).replace(UNSAFE_IN_JOB_ID, "-")).join("__");
}
