import { affinityLabel, GALLERY_COPY, UI_MS } from "@eidolon/config";
import { isString } from "es-toolkit";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GalleryGrid } from "@/components/characters/GalleryGrid";
import { GalleryViewer } from "@/components/characters/GalleryViewer";
import { PortraitSheet } from "@/components/characters/PortraitSheet";
import { ProfileHero } from "@/components/characters/ProfileHero";
import { openMode, type StackRoute } from "@/lib/stack-nav";
import { useAffinityStore } from "@/store/affinity-store";
import { type CharacterSummary, fetchCharacters } from "@/store/character-api";
import { useConnectionStore } from "@/store/connection";
import { fetchGallery, type GalleryImage, mergePage } from "@/store/gallery-api";
import { useResolvedTheme } from "@/store/theme-store";

const PADDING_PX = 16;

export default function CharacterProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = isString(id) ? id : "";
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const serverHost = useConnectionStore((state) => state.serverHost);
  const insight = useAffinityStore((state) => state.isInsightModeEnabled);

  const [character, setCharacter] = React.useState<CharacterSummary | null>(null);
  const [images, setImages] = React.useState<GalleryImage[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [viewing, setViewing] = React.useState<number | null>(null);
  const [portraitOpen, setPortraitOpen] = React.useState(false);

  // The profile is a detail of a conversation, not a step on the way to one, so
  // opening the chat either returns to the one already below or takes the
  // profile's place. Either way the back gesture reaches the roster next.
  const openChat = React.useCallback(() => {
    const routes = (navigation.getState()?.routes ?? []) as StackRoute[];
    const href = `/chat/${characterId}` as const;

    if (openMode(routes, "chat", characterId) === "dismissTo") router.dismissTo(href);
    else router.replace(href);
  }, [navigation, router, characterId]);

  useFocusEffect(
    React.useCallback(() => {
      let live = true;
      setLoading(true);

      void Promise.all([fetchCharacters(serverHost), fetchGallery(serverHost, characterId)]).then(
        ([roster, page]) => {
          if (!live) return;
          setCharacter(roster.find((entry) => entry.id === characterId) ?? null);
          setImages(page.images);
          setTotal(page.total);
          setLoading(false);
        },
      );

      return () => {
        live = false;
      };
    }, [serverHost, characterId]),
  );

  const loadMore = React.useCallback(() => {
    if (images.length === 0 || images.length >= total) return;

    void fetchGallery(serverHost, characterId, images.length).then((page) => {
      setImages((held) => mergePage(held, page.images));
      setTotal(page.total);
    });
  }, [serverHost, characterId, images.length, total]);

  const subtitle =
    insight && character?.tier
      ? affinityLabel(character.tier, character.affinity)
      : (character?.tagline ?? "");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={loadMore}
        scrollEventThrottle={16}
      >
        <ProfileHero
          characterId={characterId}
          onGeneratePortrait={() => setPortraitOpen(true)}
          name={character?.name ?? ""}
          subtitle={subtitle}
          avatarUrl={character?.avatarUrl ?? null}
          messageCount={character?.messageCount ?? 0}
          pictureCount={total}
          onBack={() => router.back()}
          onOpenChat={openChat}
        />

        <View style={{ paddingHorizontal: PADDING_PX }}>
          <Text className="mt-6 mb-3 font-main-bold text-base text-text-primary">
            {GALLERY_COPY.title}
          </Text>

          {loading ? (
            <View className="items-center gap-3 py-16">
              <ActivityIndicator color={theme.primary} />
              <Text className="font-ui text-[12px] text-text-muted">{GALLERY_COPY.loading}</Text>
            </View>
          ) : images.length === 0 ? (
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
              className="items-center gap-2 rounded-card border border-border border-dashed px-6 py-12"
            >
              <Text className="text-center font-main text-[14px] text-text-muted leading-5">
                {GALLERY_COPY.empty}
              </Text>
            </Animated.View>
          ) : (
            <GalleryGrid
              images={images}
              characterId={characterId}
              horizontalPaddingPx={PADDING_PX}
              onOpen={setViewing}
            />
          )}

          {images.length > 0 && images.length < total ? (
            <Text className="mt-4 text-center font-ui text-[11px] text-text-muted">
              {`${images.length} / ${total}`}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <PortraitSheet
        isOpen={portraitOpen}
        characterId={characterId}
        serverHost={serverHost}
        avatarUrl={character?.avatarUrl ?? null}
        onClose={() => setPortraitOpen(false)}
        onPortrait={(url) => {
          setCharacter((held) => (held ? { ...held, avatarUrl: url } : held));
          void fetchGallery(serverHost, characterId).then((page) => {
            setImages(page.images);
            setTotal(page.total);
          });
        }}
      />

      {viewing === null ? null : (
        <GalleryViewer
          images={images}
          startIndex={viewing}
          characterId={characterId}
          serverHost={serverHost}
          onClose={() => setViewing(null)}
          onOpenChat={() => {
            setViewing(null);
            openChat();
          }}
          onAvatarChanged={(url) => {
            setCharacter((held) => (held ? { ...held, avatarUrl: url } : held));
            setImages((held) => held.map((image) => ({ ...image, isAvatar: image.url === url })));
          }}
          onDeleted={(id) => {
            setImages((held) => held.filter((image) => image.id !== id));
            setTotal((count) => Math.max(0, count - 1));
            setViewing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}
