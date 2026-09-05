import { INFLUENCE_OPEN } from "@eidolon/protocol";

export { INFLUENCE_CLOSE, INFLUENCE_OPEN, splitInfluence } from "@eidolon/protocol";

export type RoleplaySegmentKind = "dialogue" | "narration" | "influence";

export interface RoleplaySegment {
  key: string;
  kind: RoleplaySegmentKind;
  text: string;
}

const MARKUP = /(<(?:\S|\S[^<>\r\n]{0,158}\S)>)|(\*[^*]*\*?)|(\([^)]*\)?)/g;

function unwrap(chunk: string): string {
  if (chunk.startsWith(INFLUENCE_OPEN)) {
    return chunk.slice(1, -1).trim();
  }
  if (chunk.startsWith("*")) {
    return chunk.replace(/^\*/, "").replace(/\*$/, "");
  }
  return chunk;
}

function kindOf(chunk: string): RoleplaySegmentKind {
  return chunk.startsWith(INFLUENCE_OPEN) ? "influence" : "narration";
}

function push(into: RoleplaySegment[], kind: RoleplaySegmentKind, text: string): void {
  if (text.length === 0) return;
  into.push({ key: `${kind}-${into.length}`, kind, text });
}

export function parseRoleplay(raw: string): RoleplaySegment[] {
  const segments: RoleplaySegment[] = [];
  if (!raw) return segments;

  let cursor = 0;
  MARKUP.lastIndex = 0;

  let match = MARKUP.exec(raw);
  while (match !== null) {
    push(segments, "dialogue", raw.slice(cursor, match.index));
    push(segments, kindOf(match[0]), unwrap(match[0]));
    cursor = match.index + match[0].length;
    match = MARKUP.exec(raw);
  }

  push(segments, "dialogue", raw.slice(cursor));
  return segments;
}

export interface StreamingSplit {
  settled: RoleplaySegment[];
  trailing: RoleplaySegment | null;
}

export function splitTrailingWord(segments: RoleplaySegment[]): StreamingSplit {
  if (segments.length === 0) return { settled: [], trailing: null };

  const last = segments[segments.length - 1];
  const boundary = last.text.search(/\s\S*$/);
  if (boundary < 0) {
    return { settled: segments.slice(0, -1), trailing: last };
  }

  const head = last.text.slice(0, boundary);
  const tail = last.text.slice(boundary);
  const settled = segments.slice(0, -1);
  push(settled, last.kind, head);

  return {
    settled,
    trailing: { key: `${last.kind}-trailing`, kind: last.kind, text: tail },
  };
}

export function isNarrationOnly(raw: string): boolean {
  const segments = parseRoleplay(raw);
  return segments.length > 0 && segments.every((segment) => segment.kind === "narration");
}
