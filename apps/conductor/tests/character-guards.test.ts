import { afterEach, describe, expect, it } from "bun:test";
import { createCharacter, setPublic } from "@/db/characters";
import { getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { app } from "@/index";
import { AUTHED, BASE, remember, wipe } from "./support/characters";
import { TEST_OWNER_ID } from "./support/session";

afterEach(wipe);

function someoneElses(name: string) {
  const made = remember(createCharacter({ name, ownerId: "user:not-the-signed-in-one" }));
  setPublic(made.id, true);
  return made;
}

describe("changing a character somebody else wrote", () => {
  it("refuses to repaint her face", async () => {
    const hers = someoneElses("Guard Portrait");

    const res = await app.request(`${BASE}/${hers.id}/portrait`, {
      method: "POST",
      headers: { ...AUTHED, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "in a red coat" }),
    });

    expect(res.status).toBe(403);
  });

  it("refuses to write into her lorebook", async () => {
    const hers = someoneElses("Guard Lore Add");

    const res = await app.request(`${BASE}/${hers.id}/lore`, {
      method: "POST",
      headers: { ...AUTHED, "Content-Type": "application/json" },
      body: JSON.stringify({ keys: ["lisbon"], content: "not mine to add" }),
    });

    expect(res.status).toBe(403);
    expect(getLoreEntries(hers.id)).toHaveLength(0);
  });

  it("refuses to delete out of her lorebook", async () => {
    const hers = someoneElses("Guard Lore Delete");
    const entryId = upsertLoreEntry(hers.id, { keys: ["lisbon"], content: "hers" });

    const res = await app.request(`${BASE}/${hers.id}/lore/${entryId}`, {
      method: "DELETE",
      headers: AUTHED,
    });

    expect(res.status).toBe(403);
    expect(getLoreEntries(hers.id)).toHaveLength(1);
  });

  it("will not delete an entry by naming a character it does not belong to", async () => {
    const mine = remember(createCharacter({ name: "Guard Mine", ownerId: TEST_OWNER_ID }));
    const other = remember(createCharacter({ name: "Guard Other", ownerId: TEST_OWNER_ID }));
    const entryId = upsertLoreEntry(other.id, { keys: ["lisbon"], content: "the other one" });

    const res = await app.request(`${BASE}/${mine.id}/lore/${entryId}`, {
      method: "DELETE",
      headers: AUTHED,
    });

    expect(res.status).toBe(404);
    expect(getLoreEntries(other.id)).toHaveLength(1);
  });

  it("still lets her author do all of it", async () => {
    const mine = remember(createCharacter({ name: "Guard Author", ownerId: TEST_OWNER_ID }));

    const added = await app.request(`${BASE}/${mine.id}/lore`, {
      method: "POST",
      headers: { ...AUTHED, "Content-Type": "application/json" },
      body: JSON.stringify({ keys: ["lisbon"], content: "mine to add" }),
    });

    expect(added.status).toBe(201);

    const entryId = getLoreEntries(mine.id)[0]?.id ?? "";
    const removed = await app.request(`${BASE}/${mine.id}/lore/${entryId}`, {
      method: "DELETE",
      headers: AUTHED,
    });

    expect(removed.status).toBe(200);
    expect(getLoreEntries(mine.id)).toHaveLength(0);
  });
});
