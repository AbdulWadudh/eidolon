import { CHARACTER_COPY } from "@eidolon/config";
import type { SegmentedOption } from "@/components/ui/segmented";
import type { FieldKey } from "@/store/character-draft";

export type SectionKey = "identity" | "mind" | "voice" | "misc";

export const SECTION_OPTIONS: SegmentedOption<SectionKey>[] = [
  { value: "identity", label: CHARACTER_COPY.sectionIdentity },
  { value: "mind", label: CHARACTER_COPY.sectionMind },
  { value: "voice", label: CHARACTER_COPY.sectionVoice },
  { value: "misc", label: CHARACTER_COPY.sectionMisc },
];

interface SectionSpec {
  fields: FieldKey[];
}

export const SECTIONS: Record<SectionKey, SectionSpec> = {
  identity: { fields: ["name", "tagline", "greeting"] },
  mind: { fields: ["personality", "scenario", "rules", "exampleDialogue", "systemPrompt"] },
  voice: { fields: [] },
  misc: { fields: [] },
};

const BLURBS: Record<SectionKey, string> = {
  identity: CHARACTER_COPY.identityBlurb,
  mind: CHARACTER_COPY.mindBlurb,
  voice: CHARACTER_COPY.voiceBlurb,
  misc: CHARACTER_COPY.miscBlurb,
};

export function sectionBlurb(section: SectionKey): string {
  return BLURBS[section];
}
