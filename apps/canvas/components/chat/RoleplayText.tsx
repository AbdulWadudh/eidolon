import * as React from "react";
import { Text, type TextProps } from "react-native";
import { parseRoleplay, type RoleplaySegment } from "@/lib/roleplay";
import { cn } from "@/lib/utils";

export const DIALOGUE_CLASS = "font-main-bold text-base text-text-primary leading-normal";
export const NARRATION_CLASS = "font-main-italic text-sm text-text-muted leading-normal";
export const INFLUENCE_CLASS = "font-ui-medium text-xs text-primary leading-normal";

const SEGMENT_CLASS: Record<RoleplaySegment["kind"], string> = {
  dialogue: DIALOGUE_CLASS,
  narration: NARRATION_CLASS,
  influence: INFLUENCE_CLASS,
};

export function segmentClass(segment: RoleplaySegment): string {
  return SEGMENT_CLASS[segment.kind];
}

function segmentText(segment: RoleplaySegment): string {
  return segment.kind === "influence" ? ` ⟨${segment.text}⟩ ` : segment.text;
}

export interface RoleplaySegmentsProps {
  segments: RoleplaySegment[];
}

export function RoleplaySegments({ segments }: RoleplaySegmentsProps) {
  return (
    <>
      {segments.map((segment) => (
        <Text key={segment.key} className={segmentClass(segment)}>
          {segmentText(segment)}
        </Text>
      ))}
    </>
  );
}

export interface RoleplayTextProps extends TextProps {
  text: string;
  className?: string;
}

export function RoleplayText({ text, className, ...props }: RoleplayTextProps) {
  const segments = React.useMemo(() => parseRoleplay(text), [text]);

  return (
    <Text className={cn(DIALOGUE_CLASS, className)} {...props}>
      <RoleplaySegments segments={segments} />
    </Text>
  );
}
