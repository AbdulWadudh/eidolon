import { afterEach, describe, expect, it } from "bun:test";
import { apiPath } from "@eidolon/config";
import { createCharacter } from "@/db/characters";
import { currentStage, listStages, saveStageBackdrop } from "@/db/stages";
import { app } from "@/index";
import { AUTHED, remember, wipe } from "./support/characters";
import { TEST_OWNER_ID } from "./support/session";

const OTHER = "user:somebody-else";

afterEach(wipe);

describe("a moment", () => {
  it("keeps one user's scene out of another's", () => {
    const character = remember(createCharacter({ name: "Shared Stage", isPublic: true }));

    saveStageBackdrop(character.id, TEST_OWNER_ID, "the bar", "https://media.test/bar.webp");
    saveStageBackdrop(character.id, OTHER, "a rooftop", "https://media.test/roof.webp");

    expect(listStages(character.id, TEST_OWNER_ID).map((s) => s.name)).toEqual(["the bar"]);
    expect(listStages(character.id, OTHER).map((s) => s.name)).toEqual(["a rooftop"]);
    expect(currentStage(character.id, TEST_OWNER_ID)?.backdropUrl).toBe(
      "https://media.test/bar.webp",
    );
  });

  it("returns the newest scene as the current one", () => {
    const character = remember(createCharacter({ name: "Moving Stage" }));

    saveStageBackdrop(character.id, TEST_OWNER_ID, "first", "https://media.test/first.webp");
    saveStageBackdrop(character.id, TEST_OWNER_ID, "second", "https://media.test/second.webp");

    expect(currentStage(character.id, TEST_OWNER_ID)?.name).toBe("second");
  });

  it("refuses a moment with nowhere in it", async () => {
    const character = remember(createCharacter({ name: "Moment Blank" }));

    const res = await app.request(`${apiPath("characters")}/${character.id}/moment`, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ place: "   " }),
    });

    expect(res.status).toBe(400);
  });

  it("refuses a moment from nobody", async () => {
    const character = remember(createCharacter({ name: "Moment Anon" }));

    const res = await app.request(`${apiPath("characters")}/${character.id}/moment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: "a rooftop" }),
    });

    expect(res.status).toBe(401);
  });
});
