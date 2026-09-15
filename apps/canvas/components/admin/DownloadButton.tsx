import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { ActivityIndicator } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Download01Icon } from "@/lib/icons";
import { saveMediaToDevice } from "@/lib/save-media";
import { tap } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";
import { notify } from "@/store/toast-store";

export function DownloadButton({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const [isSaving, setSaving] = React.useState(false);

  const save = React.useCallback(() => {
    if (isSaving) return;
    setSaving(true);

    void saveMediaToDevice(url)
      .then((outcome) => {
        if (outcome.result === "saved") {
          tap("success");
          notify(
            outcome.target === "gallery"
              ? DASHBOARD_COPY.downloadedGallery
              : DASHBOARD_COPY.downloadedFile(outcome.name),
            "good",
          );
          return;
        }

        tap("light");
        notify(
          outcome.result === "denied"
            ? DASHBOARD_COPY.downloadDenied
            : DASHBOARD_COPY.downloadFailed,
          "bad",
        );
      })
      .finally(() => setSaving(false));
  }, [isSaving, url]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={DASHBOARD_COPY.download}
      accessibilityState={{ busy: isSaving }}
      hitSlop={8}
      onPress={save}
      className="h-7 w-7 items-center justify-center rounded-button border border-border"
    >
      {isSaving ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <AppIcon icon={Download01Icon} size={13} color={theme.textMuted} />
      )}
    </PressableScale>
  );
}
