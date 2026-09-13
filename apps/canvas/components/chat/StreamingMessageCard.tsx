import { CHAT, CHAT_MS } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AudioTabSkeleton } from "@/components/audio/AudioTabSkeleton";
import { GlassSurface } from "@/components/ui/glass-surface";
import { parseRoleplay, splitTrailingWord } from "@/lib/roleplay";
import { QuillBead } from "./QuillBead";
import { RoleplaySegments, segmentClass } from "./RoleplayText";

const AnimatedText = Animated.createAnimatedComponent(Text);

export interface StreamingMessageCardProps {
  text: string;
  status: string | null;
  characterId?: string;
  isSynthesizingAudio?: boolean;
}

export function StreamingMessageCard({
  text,
  status,
  characterId,
  isSynthesizingAudio = false,
}: StreamingMessageCardProps) {
  const reduced = useReducedMotion();
  const split = React.useMemo(() => splitTrailingWord(parseRoleplay(text)), [text]);

  return (
    <View className="my-1.5 mr-10 items-start">
      {isSynthesizingAudio ? (
        <AudioTabSkeleton characterId={characterId} overlap={CHAT.audioTabOverlapPx} />
      ) : null}
      <GlassSurface
        tint="card"
        characterId={characterId}
        className="w-full rounded-card border border-primary/25 p-3.5"
        style={isSynthesizingAudio ? { borderTopLeftRadius: 0 } : undefined}
      >
        {text.length === 0 && status ? (
          <Text
            accessibilityLiveRegion="polite"
            className="font-ui text-text-muted text-xs uppercase tracking-wider"
          >
            {status}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap items-end">
          <Text className="font-main-bold text-base text-text-primary leading-normal">
            <RoleplaySegments segments={split.settled} />
            {split.trailing ? (
              <AnimatedText
                key={split.trailing.text}
                className={segmentClass(split.trailing)}
                style={
                  reduced
                    ? undefined
                    : {
                        animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
                        animationDuration: CHAT_MS.tokenFade,
                        animationTimingFunction: "ease-out",
                        animationFillMode: "both",
                      }
                }
              >
                {split.trailing.text}
              </AnimatedText>
            ) : null}
          </Text>
          <QuillBead characterId={characterId} />
        </View>
      </GlassSurface>
    </View>
  );
}
