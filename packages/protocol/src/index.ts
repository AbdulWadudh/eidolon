import { type ClientMessage, ClientMessageSchema } from "./events/client";
import { type ServerMessage, ServerMessageSchema } from "./events/server";

export * from "./character";
export * from "./events/client";
export * from "./events/server";

/**
 * Validates and parses an unknown incoming client message against the ClientMessageSchema.
 * Throws a ZodError if validation fails.
 */
export function parseClientMessage(raw: unknown): ClientMessage {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return ClientMessageSchema.parse(parsed);
}

/**
 * Validates and parses an unknown incoming server message against the ServerMessageSchema.
 * Throws a ZodError if validation fails.
 */
export function parseServerMessage(raw: unknown): ServerMessage {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return ServerMessageSchema.parse(parsed);
}

/**
 * Safely attempts to validate and parse a client message.
 */
export function safeParseClientMessage(raw: unknown) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return ClientMessageSchema.safeParse(parsed);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Safely attempts to validate and parse a server message.
 */
export function safeParseServerMessage(raw: unknown) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return ServerMessageSchema.safeParse(parsed);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
