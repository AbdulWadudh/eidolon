import { describe, expect, it } from "bun:test";
import {
  SECTION_OPTIONS,
  SECTIONS,
  type SectionKey,
  sectionBlurb,
} from "@/components/chat/character-settings-sections";
import { EMPTY_DRAFT, type FieldKey } from "@/store/character-draft";

const grouped = Object.values(SECTIONS).flatMap((spec) => spec.fields);

describe("grouping the card into sections", () => {
  it("reaches every editable field", () => {
    // `voice` has its own picker rather than a text field.
    const editable = (Object.keys(EMPTY_DRAFT) as (keyof typeof EMPTY_DRAFT)[]).filter(
      (key): key is FieldKey => key !== "voice",
    );

    expect([...grouped].sort()).toEqual([...editable].sort());
  });

  it("puts no field in two places", () => {
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("offers a tab for every section, and a section for every tab", () => {
    const tabs = SECTION_OPTIONS.map((option) => option.value);
    expect([...tabs].sort()).toEqual((Object.keys(SECTIONS) as SectionKey[]).sort());
  });

  it("explains each section", () => {
    for (const key of Object.keys(SECTIONS) as SectionKey[]) {
      expect(sectionBlurb(key).length).toBeGreaterThan(0);
    }
  });

  it("opens on a section that has something to edit", () => {
    expect(SECTIONS.identity.fields.length).toBeGreaterThan(0);
  });
});
