import { CONFIRM_COPY, DASHBOARD_COPY, MIND_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import {
  AdminRequestError,
  type CharacterOperationsView,
  cancelProactive,
  fetchCharacterOperations,
  summarizeCharacter,
} from "@/store/admin-api";

export interface CharacterOperationsProps {
  characterId: string;
  serverHost: string;
  token: string;
}

export function CharacterOperations({ characterId, serverHost, token }: CharacterOperationsProps) {
  const confirmation = useConfirm(characterId);

  const [view, setView] = React.useState<CharacterOperationsView | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isWorking, setWorking] = React.useState(false);

  const reload = React.useCallback(() => {
    fetchCharacterOperations(serverHost, token, characterId)
      .then(setView)
      .catch(() => setView(null));
  }, [characterId, serverHost, token]);

  React.useEffect(reload, [reload]);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setNotice(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const summarize = React.useCallback(() => {
    setNotice(null);
    setWorking(true);
    summarizeCharacter(serverHost, token, characterId)
      .then(() => setNotice(DASHBOARD_COPY.summarizeQueued))
      .catch(report)
      .finally(() => {
        setWorking(false);
        reload();
      });
  }, [characterId, reload, report, serverHost, token]);

  const drop = React.useCallback(() => {
    confirmation.ask({
      title: CONFIRM_COPY.cancelProactive,
      body: CONFIRM_COPY.cancelProactiveBody,
      confirmLabel: CONFIRM_COPY.cancelProactiveAction,
      onConfirm: () => {
        setNotice(null);
        cancelProactive(serverHost, token, characterId).catch(report).finally(reload);
      },
    });
  }, [characterId, confirmation.ask, reload, report, serverHost, token]);

  return (
    <GlassSurface
      tint="card"
      className="gap-3 overflow-hidden rounded-card border border-border p-4"
    >
      <View className="flex-row items-center gap-4">
        <Stat label={MIND_COPY.chapterLabel} value={view?.chapters ?? 0} />
        <Stat label="Messages" value={view?.messages ?? 0} />
      </View>

      <Button variant="secondary" size="sm" disabled={isWorking} onPress={summarize}>
        {DASHBOARD_COPY.summarizeNow}
      </Button>

      {view?.proactive ? (
        <View className="gap-2 border-border border-t pt-3">
          <Text className="font-ui text-[11px] text-text-muted">
            {CONFIRM_COPY.proactiveWaiting(new Date(view.proactive.runAt).toLocaleString())}
          </Text>
          <Button variant="ghost" size="sm" onPress={drop}>
            {CONFIRM_COPY.cancelProactiveAction}
          </Button>
        </View>
      ) : null}

      {notice ? (
        <Text accessibilityLiveRegion="polite" className="font-ui text-[11px] text-text-muted">
          {notice}
        </Text>
      ) : null}

      {confirmation.sheet}
    </GlassSurface>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text className="font-main-bold text-base text-primary">{value}</Text>
      <Text className="font-ui text-[11px] text-text-muted">{label}</Text>
    </View>
  );
}
