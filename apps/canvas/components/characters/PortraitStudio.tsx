import { AUTHOR_COPY, CHAT, FIELD_PADDING, PORTRAIT_POLL_MS, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AuthorButtons } from "@/components/chat/mind/AuthorButtons";
import { Button } from "@/components/ui/button";
import { useTextAuthor } from "@/hooks/use-text-author";
import { tap } from "@/services/haptics";
import { requestPortrait } from "@/store/character-api";
import { fetchLook } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface PortraitStudioProps {
  characterId: string;
  serverHost: string;
  avatarUrl: string | null;
  onPortrait: (url: string) => void;
}

const AUTHOR_SLOT_PX = 72;

export function PortraitStudio({
  characterId,
  serverHost,
  avatarUrl,
  onPortrait,
}: PortraitStudioProps) {
  const theme = useResolvedTheme(characterId);
  const author = useTextAuthor(serverHost, "portrait");
  const reduced = useReducedMotion();

  const [extra, setExtra] = React.useState("");
  const [waiting, setWaiting] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const startedWith = React.useRef<string | null>(avatarUrl);

  React.useEffect(() => {
    if (!waiting) return;

    const timer = setInterval(() => {
      void fetchLook(serverHost, characterId).then((look) => {
        if (!look?.avatarUrl || look.avatarUrl === startedWith.current) return;
        setWaiting(false);
        setNote(null);
        tap("success");
        onPortrait(look.avatarUrl);
      });
    }, PORTRAIT_POLL_MS);

    return () => clearInterval(timer);
  }, [waiting, serverHost, characterId, onPortrait]);

  const generate = React.useCallback(() => {
    startedWith.current = avatarUrl;
    setWaiting(true);
    setNote(AUTHOR_COPY.portraitQueued);

    void requestPortrait(serverHost, characterId, extra.trim()).then((queued) => {
      if (queued) return;
      setWaiting(false);
      setNote(AUTHOR_COPY.portraitFailed);
    });
  }, [serverHost, characterId, extra, avatarUrl]);

  return (
    <View className="gap-4">
      <View className="flex-row gap-4">
        <View
          className="h-24 w-20 overflow-hidden rounded-card border border-border"
          style={{ backgroundColor: theme.inputSurface }}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ flex: 1 }} contentFit="cover" />
          ) : null}

          {waiting ? (
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <ActivityIndicator size="small" color={theme.primary} />
            </Animated.View>
          ) : null}
        </View>

        <View className="flex-1">
          <Text className="font-ui-bold text-[13px] text-text-primary">
            {AUTHOR_COPY.portraitTitle}
          </Text>
          <Text className="mt-1 font-ui text-[11px] text-text-muted leading-4">
            {AUTHOR_COPY.portraitBlurb}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-ui-bold text-[13px] text-text-primary">
          {AUTHOR_COPY.portraitExtraLabel}
        </Text>
        <Text className="font-ui text-[11px] text-text-muted leading-4">
          {AUTHOR_COPY.portraitExtraHint}
        </Text>

        <View className="relative">
          <TextInput
            accessibilityLabel={AUTHOR_COPY.portraitExtraLabel}
            value={extra}
            onChangeText={setExtra}
            editable={!waiting}
            placeholderTextColor={theme.textMuted}
            cursorColor={theme.primary}
            selectionColor={theme.primary}
            className="rounded-button border border-border bg-input font-main text-[15px] text-text-primary leading-6"
            style={{
              minHeight: CHAT.minTouchTargetPx + 8,
              paddingHorizontal: FIELD_PADDING.horizontal,
              paddingVertical: FIELD_PADDING.vertical,
              paddingRight: AUTHOR_SLOT_PX,
              opacity: waiting ? 0.5 : 1,
            }}
          />

          <View className="absolute top-0 right-2 bottom-0 justify-center">
            <AuthorButtons
              characterId={characterId}
              author={author}
              draft={extra}
              onText={setExtra}
            />
          </View>
        </View>
      </View>

      {note ? (
        <Animated.Text
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          accessibilityLiveRegion="polite"
          className="font-ui text-[11px] text-text-muted leading-4"
        >
          {note}
        </Animated.Text>
      ) : null}

      <Button variant="default" size="default" disabled={waiting} onPress={generate}>
        {waiting
          ? AUTHOR_COPY.portraitWaiting
          : avatarUrl
            ? AUTHOR_COPY.portraitRegenerate
            : AUTHOR_COPY.portraitGenerate}
      </Button>
    </View>
  );
}
