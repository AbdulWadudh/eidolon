/** The folder one level up, or "" at the top of the bucket. */
export function parentOf(prefix: string): string {
  const parts = prefix.split("/").filter(Boolean);
  parts.pop();

  return parts.length > 0 ? `${parts.join("/")}/` : "";
}

/**
 * The bucket is laid out by uuid, which no one can read at a glance. Any path segment
 * that is a character we know about is shown as her name instead, unless the ids are
 * being asked for — the keys themselves never change, only what is printed.
 */
export function readable(path: string, names: Record<string, string>, showIds: boolean): string {
  if (showIds) return path;

  return path
    .split("/")
    .map((segment) => names[segment] ?? segment)
    .join("/");
}
