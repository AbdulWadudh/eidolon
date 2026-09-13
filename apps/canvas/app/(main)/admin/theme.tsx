import { DASHBOARD_COPY, THEME_COPY } from "@eidolon/config";
import type { AdminThemeView } from "@eidolon/protocol";
import type { ThemeTokens } from "@eidolon/tokens";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTheme, resetTheme, resetThemeToken, saveTheme } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";

type TokenKey = keyof ThemeTokens;

function isColour(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("#");
}

export default function AdminThemeScreen() {
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [view, setView] = React.useState<AdminThemeView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [saveState, runSave] = useSaveState();

  React.useEffect(() => {
    let live = true;

    fetchTheme(serverHost, pairingToken)
      .then((body) => {
        if (!live) return;
        setView(body);
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setError(DASHBOARD_COPY.failed);
        setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [serverHost, pairingToken]);

  const tokens = React.useMemo(
    () => (view ? (Object.keys(view.tokens) as TokenKey[]) : []),
    [view],
  );

  const overriddenCount = view ? Object.keys(view.overrides).length : 0;

  const open = React.useCallback(
    (token: TokenKey) => {
      if (openKey === token) {
        setOpenKey(null);
        return;
      }
      setOpenKey(token);
      setDraft(String(view?.tokens[token] ?? ""));
    },
    [openKey, view],
  );

  const commit = React.useCallback(
    (token: TokenKey) => {
      if (!view) return;
      const shipped = view.defaults[token];
      const next = typeof shipped === "number" ? Number(draft) : draft;
      if (typeof shipped === "number" && !Number.isFinite(next as number)) {
        setError(DASHBOARD_COPY.failed);
        return;
      }

      setError(null);
      void runSave(() =>
        saveTheme(serverHost, pairingToken, { [token]: next }).then(setView),
      ).catch(() => setError(DASHBOARD_COPY.failed));
    },
    [draft, pairingToken, runSave, serverHost, view],
  );

  const revert = React.useCallback(
    (token: TokenKey) => {
      setError(null);
      resetThemeToken(serverHost, pairingToken, token)
        .then((body) => {
          setView(body);
          setDraft(String(body.tokens[token] ?? ""));
        })
        .catch(() => setError(DASHBOARD_COPY.failed));
    },
    [pairingToken, serverHost],
  );

  const revertAll = React.useCallback(() => {
    setError(null);
    resetTheme(serverHost, pairingToken)
      .then(setView)
      .catch(() => setError(DASHBOARD_COPY.failed));
  }, [pairingToken, serverHost]);

  return (
    <AdminScreen
      title={DASHBOARD_COPY.themeTitle}
      blurb={DASHBOARD_COPY.themeBlurb}
      isLoading={isLoading}
      error={error}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-ui text-xs text-text-muted">
          {DASHBOARD_COPY.overriddenCount(overriddenCount)}
        </Text>
        {overriddenCount > 0 ? (
          <Button variant="secondary" size="sm" onPress={revertAll}>
            {THEME_COPY.startOver}
          </Button>
        ) : null}
      </View>

      {tokens.length === 0 ? (
        <AdminEmpty />
      ) : (
        tokens.map((token, index) => {
          const current = view?.tokens[token];
          const shipped = view?.defaults[token];
          const isOverridden = view ? token in view.overrides : false;

          return (
            <Animated.View entering={revealAt(index, reduced)} key={token}>
              <EditableRow
                title={token}
                subtitle={`${DASHBOARD_COPY.shipped}: ${String(shipped)}`}
                badge={isOverridden ? DASHBOARD_COPY.custom : null}
                expanded={openKey === token}
                onToggle={() => open(token)}
                onSave={() => commit(token)}
                onReset={isOverridden ? () => revert(token) : undefined}
                saveState={saveState}
                canSave={draft.trim().length > 0 && draft !== String(current)}
              >
                <View className="flex-row items-center gap-3">
                  {isColour(current) ? (
                    <View
                      className="h-9 w-9 rounded-button border border-border"
                      style={{ backgroundColor: current }}
                    />
                  ) : null}
                  <View className="flex-1">
                    <Input
                      value={draft}
                      onChangeText={setDraft}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType={typeof shipped === "number" ? "numeric" : "default"}
                    />
                  </View>
                </View>
              </EditableRow>
            </Animated.View>
          );
        })
      )}
    </AdminScreen>
  );
}
