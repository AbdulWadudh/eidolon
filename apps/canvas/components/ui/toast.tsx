import { UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useResolvedTheme } from "@/store/theme-store";
import { type ToastTone, useToastStore } from "@/store/toast-store";

export function Toast() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);

  const toastId = toast?.id ?? null;

  const isSticky = toast?.sticky === true;

  React.useEffect(() => {
    if (!toastId) return;

    const timer = setTimeout(
      () => dismiss(toastId),
      isSticky ? UI_MS.toastStickyMax : UI_MS.toastHold,
    );
    return () => clearTimeout(timer);
  }, [toastId, isSticky, dismiss]);

  if (!toast) return null;

  const edge: Record<ToastTone, string> = {
    neutral: theme.cardBorder,
    good: theme.success,
    bad: theme.danger,
  };

  const body = (
    <View pointerEvents="none" className="absolute inset-x-0 bottom-0 z-50 items-center px-4 pb-8">
      <Animated.View
        key={toast.id}
        entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
        exiting={reduced ? undefined : FadeOutDown.duration(UI_MS.toastExit)}
        accessibilityLiveRegion="polite"
        accessibilityLabel={toast.message}
        className="max-w-full overflow-hidden rounded-card border"
        style={{ borderColor: edge[toast.tone] }}
      >
        <GlassSurface tint="card" overlay className="px-4 py-2.5">
          <Text className="font-ui-medium text-xs text-text-primary" numberOfLines={3}>
            {toast.message}
          </Text>
        </GlassSurface>
      </Animated.View>
    </View>
  );

  if (isSticky) return body;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => dismiss(toast.id)}
    >
      {body}
    </Modal>
  );
}
