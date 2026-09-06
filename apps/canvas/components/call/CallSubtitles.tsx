import { CALL, CALL_COPY, CALL_MS } from "@eidolon/config";
import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface CallSubtitlesProps {
  characterId: string;
  characterName: string;
  subtitle: string;
  heard: string;
  isListening: boolean;
  error: string | null;
}

interface SpokenLineProps {
  label: string;
  labelColor: string;
  text: string;
  reduced: boolean;
}

function SpokenLine({ label, labelColor, text, reduced }: SpokenLineProps) {
  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(CALL_MS.subtitleFade)}>
      <Text
        className="mb-1 font-ui-bold text-[11px] uppercase tracking-wider"
        style={{ color: labelColor }}
      >
        {label}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        className="font-main-bold text-text-primary"
        style={{ fontSize: 16, lineHeight: 24 }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

export function CallSubtitles({
  characterId,
  characterName,
  subtitle,
  heard,
  isListening,
  error,
}: CallSubtitlesProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const scroller = React.useRef<ScrollView>(null);

  const yours = heard.trim();
  const hers = subtitle.trim();
  const showsYours = isListening || yours.length > 0;
  const yourLine = yours.length > 0 ? yours : CALL_COPY.hearing;
  const isEmpty = !showsYours && hers.length === 0;

  return (
    <View
      className="w-full rounded-card border border-border bg-card"
      style={{
        minHeight: CALL.subtitleMinHeightPx,
        maxHeight: CALL.subtitleMaxHeightPx,
        borderRadius: theme.radius,
      }}
    >
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: !reduced })}
      >
        {showsYours ? (
          <SpokenLine
            label={CALL_COPY.yourTurn}
            labelColor={theme.success}
            text={yourLine}
            reduced={reduced}
          />
        ) : null}

        {hers.length > 0 ? (
          <SpokenLine
            label={characterName}
            labelColor={theme.primary}
            text={hers}
            reduced={reduced}
          />
        ) : null}

        {isEmpty ? (
          <Text
            className="text-center font-main text-text-muted italic"
            style={{ fontSize: 16, lineHeight: 24 }}
          >
            {CALL_COPY.subtitlePlaceholder}
          </Text>
        ) : null}

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="font-ui text-xs"
            style={{ color: theme.danger }}
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
