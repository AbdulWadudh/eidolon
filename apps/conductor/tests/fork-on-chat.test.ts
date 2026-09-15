import { afterEach, describe, expect, it } from "bun:test";
import {
  appendMessage,
  getCharacterCard,
  getCharacterMind,
  getTranscript,
  saveCharacterMind,
} from "@/db";
import {
  createCharacter,
  existingForkFor,
  forkForUser,
  listCharacters,
  setPublic,
  updateCharacter,
} from "@/db/characters";
import { getCharacterAvatar, setCharacterAvatar } from "@/db/look";
import { getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { remember, wipe } from "./support/characters";

const AUTHOR = "user:fork-author";
const STRANGER = "user:fork-stranger";

function published(name: string) {
  const made = remember(createCharacter({ name, ownerId: AUTHOR, personality: "as written" }));
  setPublic(made.id, true);
  return made;
}

afterEach(wipe);

describe("meeting a character someone else owns", () => {
  it("hands the stranger a copy of their own", () => {
    const mara = published("Fork Mara");
    const mine = forkForUser(mara.id, STRANGER);

    expect(mine).not.toBeNull();
    expect(mine?.id).not.toBe(mara.id);
    expect(mine?.ownerId).toBe(STRANGER);
    expect(mine?.forkedFrom).toBe(mara.id);
    expect(mine?.name).toBe("Fork Mara");
    remember({ id: mine?.id ?? "" });
  });

  it("leaves the author talking to the character itself", () => {
    const mara = published("Fork Author Talks");

    expect(forkForUser(mara.id, AUTHOR)).toBeNull();
  });

  it("returns the same copy on every later message rather than piling them up", () => {
    const mara = published("Fork Once");
    const first = forkForUser(mara.id, STRANGER);
    const second = forkForUser(mara.id, STRANGER);

    remember({ id: first?.id ?? "" });
    expect(second?.id).toBe(first?.id);
  });

  it("carries her lorebook across so she is not a stranger to herself", () => {
    const mara = published("Fork Lore");
    upsertLoreEntry(mara.id, { keys: ["lisbon"], content: "the summer she left" });

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    expect(getLoreEntries(mine?.id ?? "").map((entry) => entry.content)).toContain(
      "the summer she left",
    );
  });

  it("keeps the author's later edits away from a conversation already under way", () => {
    const mara = published("Fork Frozen");
    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    updateCharacter(mara.id, { personality: "rewritten by her author" });
    setCharacterAvatar(mara.id, "https://media.test/authors-new-face.webp");

    expect(getCharacterCard(mine?.id ?? "", STRANGER).personality).toBe("as written");
    expect(getCharacterAvatar(mine?.id ?? "")).not.toBe("https://media.test/authors-new-face.webp");
  });

  it("keeps the stranger's own changes away from the author", () => {
    const mara = published("Fork Mine Only");
    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    setCharacterAvatar(mine?.id ?? "", "https://media.test/my-face.webp");
    updateCharacter(mine?.id ?? "", { personality: "how I see her" });

    expect(getCharacterAvatar(mara.id)).not.toBe("https://media.test/my-face.webp");
    expect(getCharacterCard(mara.id, AUTHOR).personality).toBe("as written");
  });

  it("keeps each conversation to its own copy", () => {
    const mara = published("Fork Two Strangers");
    const mine = forkForUser(mara.id, STRANGER);
    const theirs = forkForUser(mara.id, "user:fork-third");
    remember({ id: mine?.id ?? "" });
    remember({ id: theirs?.id ?? "" });

    appendMessage(mine?.id ?? "", "user", "only I said this", STRANGER);

    expect(mine?.id).not.toBe(theirs?.id);
    expect(listCharacters(STRANGER).find((c) => c.id === theirs?.id)).toBeUndefined();
  });

  it("shows the stranger one of her, not the original beside the copy", () => {
    const mara = published("Fork No Double");
    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    const roster = listCharacters(STRANGER).filter((c) => c.name === "Fork No Double");

    expect(roster).toHaveLength(1);
    expect(roster[0]?.id).toBe(mine?.id ?? "");
  });
});

describe("opening a character before answering her", () => {
  it("keeps her greeting in the conversation instead of stranding it", () => {
    const mara = published("Fork Greeting Kept");

    // What the chat screen does the moment it opens: her greeting becomes a real message.
    const greetingId = appendMessage(mara.id, "assistant", "You came back.", STRANGER);

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    const carried = getTranscript(mine?.id ?? "", STRANGER, 10);
    expect(carried.map((line) => line.content)).toContain("You came back.");
    expect(carried[0]?.id).toBe(greetingId);
    expect(getTranscript(mara.id, STRANGER, 10)).toHaveLength(0);
  });

  it("answers with the greeting behind it, not as if the talk began cold", () => {
    const mara = published("Fork Greeting Context");
    appendMessage(mara.id, "assistant", "You came back.", STRANGER);

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });
    appendMessage(mine?.id ?? "", "user", "I did.", STRANGER);

    const seen = getTranscript(mine?.id ?? "", STRANGER, 10).map((line) => line.content);
    expect(seen).toEqual(["You came back.", "I did."]);
  });

  it("carries how she felt about them, so the fork is not a stranger", () => {
    const mara = published("Fork Feeling Kept");
    appendMessage(mara.id, "assistant", "hello", STRANGER);
    saveCharacterMind(mara.id, STRANGER, { score: 42, tier: "Fond", mood: "Playful" });

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    expect(getCharacterMind(mine?.id ?? "", STRANGER).score).toBe(42);
  });

  it("leaves another user's conversation with the original exactly where it was", () => {
    const mara = published("Fork Others Untouched");
    appendMessage(mara.id, "assistant", "for the stranger", STRANGER);
    appendMessage(mara.id, "assistant", "for someone else", "user:fork-bystander");

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    expect(getTranscript(mara.id, "user:fork-bystander", 10)).toHaveLength(1);
    expect(getTranscript(mine?.id ?? "", "user:fork-bystander", 10)).toHaveLength(0);
  });
});

describe("browsing her before deciding to talk", () => {
  it("makes no copy just because someone looked", () => {
    const mara = published("Fork Only Browsed");

    expect(existingForkFor(mara.id, STRANGER)).toBeNull();
    expect(listCharacters(STRANGER).filter((c) => c.name === "Fork Only Browsed")).toHaveLength(1);
  });

  it("writes no greeting into a conversation that has not started", () => {
    const mara = published("Fork Unstarted");

    expect(getTranscript(mara.id, STRANGER, 10)).toHaveLength(0);
  });

  it("makes the copy only when they say they want to talk", () => {
    const mara = published("Fork On Request");

    const mine = forkForUser(mara.id, STRANGER);
    remember({ id: mine?.id ?? "" });

    expect(mine).not.toBeNull();
    expect(existingForkFor(mara.id, STRANGER)?.id).toBe(mine?.id ?? "");
  });

  it("hands back the same copy if they press it twice", () => {
    const mara = published("Fork Pressed Twice");
    const first = forkForUser(mara.id, STRANGER);
    const second = forkForUser(mara.id, STRANGER);

    remember({ id: first?.id ?? "" });
    expect(second?.id).toBe(first?.id ?? "");
  });
});
