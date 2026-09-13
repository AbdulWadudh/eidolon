import { CONNECT_COPY, CONNECT_MESSAGES, UI_MS } from "@eidolon/config";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { AppIcon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircleIcon, CheckmarkCircle01Icon, HardDriveIcon } from "@/lib/icons";
import { useAuthStore } from "@/store/auth-store";
import { pingHealth, useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const DEFAULT_HOST = process.env.EXPO_PUBLIC_CONDUCTOR_HOST ?? "";

type Reach = "unknown" | "checking" | "reachable" | "unreachable";

function humanError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return CONNECT_MESSAGES.includes(message) ? message : CONNECT_COPY.unreachable;
}

export default function SignInScreen() {
  const router = useRouter();
  const startSession = useConnectionStore((state) => state.startSession);
  const setAccount = useAuthStore((state) => state.setAccount);
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();

  const [hostInput, setHostInput] = React.useState(DEFAULT_HOST);
  const [reach, setReach] = React.useState<Reach>("unknown");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const reveal = (index: number) =>
    reduced
      ? FadeIn.duration(UI_MS.revealReduced)
      : FadeInDown.duration(UI_MS.reveal).delay(index * UI_MS.revealStagger);

  const checkHost = React.useCallback(async () => {
    if (!hostInput.trim()) {
      setErrorMessage(CONNECT_COPY.missingFields);
      return;
    }

    setReach("checking");
    setErrorMessage(null);

    try {
      await pingHealth(hostInput);
      setReach("reachable");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setReach("unreachable");
      setErrorMessage(humanError(err));
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  }, [hostInput]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={reveal(0)} className="mb-6 items-center">
            <Text className="font-main-bold text-2xl text-text-primary tracking-tight">
              {CONNECT_COPY.title}
            </Text>
            <Text className="mt-1 text-center font-ui text-sm text-text-muted">
              {CONNECT_COPY.subtitle}
            </Text>
          </Animated.View>

          <Animated.View entering={reveal(1)}>
            <Card className="flex-col gap-3">
              <View>
                <Text className="mb-1 font-ui text-xs text-text-muted">
                  {CONNECT_COPY.addressLabel}
                </Text>
                <Input
                  leading={HardDriveIcon}
                  placeholder={DEFAULT_HOST || "192.168.1.39:3000"}
                  value={hostInput}
                  onChangeText={(next) => {
                    setHostInput(next);
                    setReach("unknown");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={reach !== "checking"}
                  returnKeyType="go"
                  onSubmitEditing={() => void checkHost()}
                />
                <Text className="mt-1 font-ui text-[11px] text-text-muted">
                  {CONNECT_COPY.addressHint}
                </Text>
              </View>

              {reach === "reachable" ? (
                <Animated.View
                  entering={FadeIn.duration(reduced ? UI_MS.revealReduced : UI_MS.disclosure)}
                  className="flex-row items-center gap-2"
                >
                  <AppIcon icon={CheckmarkCircle01Icon} size={14} color={theme.success} />
                  <Text className="font-ui-medium text-success text-xs">
                    Your Eidolon answered.
                  </Text>
                </Animated.View>
              ) : (
                <Button
                  variant="secondary"
                  disabled={reach === "checking"}
                  onPress={() => void checkHost()}
                >
                  {reach === "checking" ? (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" color={theme.textPrimary} />
                      <Text className="font-ui-medium text-sm text-text-primary">
                        {CONNECT_COPY.connecting}
                      </Text>
                    </View>
                  ) : (
                    CONNECT_COPY.connect
                  )}
                </Button>
              )}
            </Card>
          </Animated.View>

          {errorMessage ? (
            <Animated.View
              entering={
                reduced ? FadeIn.duration(UI_MS.revealReduced) : FadeInDown.duration(UI_MS.reveal)
              }
            >
              <Card className="mt-4 flex-row items-start gap-2 border-danger">
                <AppIcon icon={AlertCircleIcon} size={14} color={theme.danger} />
                <Text
                  accessibilityLiveRegion="assertive"
                  className="flex-1 font-ui-medium text-danger text-xs"
                >
                  {errorMessage}
                </Text>
              </Card>
            </Animated.View>
          ) : null}

          <Animated.View entering={reveal(2)} className="mt-2">
            <SignInPanel
              host={hostInput}
              onSignedIn={(token, account) => {
                startSession(hostInput, token);
                setAccount(account);
                router.replace("/(main)");
              }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
