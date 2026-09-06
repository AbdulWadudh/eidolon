import { IMPORT_COPY } from "@eidolon/config";
import * as DocumentPicker from "expo-document-picker";
import * as React from "react";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUploadIcon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { importTavernCard } from "@/store/card-api";
import { useResolvedTheme } from "@/store/theme-store";

type Stage = "idle" | "uploading";

export interface ImportCardButtonProps {
  serverHost: string;
  onImported: (characterId: string) => void;
}

export function ImportCardButton({ serverHost, onImported }: ImportCardButtonProps) {
  const theme = useResolvedTheme();
  const [stage, setStage] = React.useState<Stage>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const isOffline = serverHost.length === 0;

  const pick = React.useCallback(async () => {
    setError(null);

    const picked = await DocumentPicker.getDocumentAsync({
      type: ["image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;

    setStage("uploading");
    const result = await importTavernCard(serverHost, {
      uri: asset.uri,
      name: asset.name || "card.png",
    });
    setStage("idle");

    if (!result.ok) {
      setError(result.error.length > 0 ? result.error : IMPORT_COPY.failed);
      return;
    }

    tap("success");
    onImported(result.character.characterId);
  }, [serverHost, onImported]);

  return (
    <Card className="border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={FileUploadIcon} size={16} color={theme.primary} />
            <Text className="font-main-bold text-sm text-text-primary">{IMPORT_COPY.action}</Text>
          </View>
          <Text className="mt-1 font-ui text-xs text-text-muted">
            {isOffline ? IMPORT_COPY.offline : IMPORT_COPY.blurb}
          </Text>
        </View>

        <Button
          variant="secondary"
          size="sm"
          disabled={isOffline || stage === "uploading"}
          onPress={() => {
            void pick();
          }}
        >
          {stage === "uploading" ? IMPORT_COPY.uploading : IMPORT_COPY.action}
        </Button>
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 font-ui text-xs"
          style={{ color: theme.danger }}
        >
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
