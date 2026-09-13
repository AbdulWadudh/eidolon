import { CONNECT_COPY, CONNECT_MESSAGES, UI_MS } from "@eidolon/config";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircleIcon, CheckmarkCircle01Icon, HardDriveIcon } from "@/lib/icons";
import { useAuthStore } from "@/store/auth-store";
import { pingHealth, useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const DEFAULT_HOST = process.env.EXPO_PUBLIC_CONDUCTOR_HOST ?? "";
const MARK = require("../../assets/logo.png");
const MARK_PX = 68;

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
  const [addressOpen, setAddressOpen] = React.useState(!DEFAULT_HOST);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const reveal = (index: number) =>
    reduced
      ? FadeIn.duration(UI_MS.revealReduced)
      : FadeInDown.duration(UI_MS.reveal).delay(index * UI_MS.revealStagger);

  const checkHost = React.useCallback(async () => {
    const host = hostInput.trim();
    if (!host) {
      setReach("unknown");
      return;
    }

    setReach("checking");
    setErrorMessage(null);

    try {
      await pingHealth(host);
      setReach("reachable");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setReach("unreachable");
      setAddressOpen(true);
      setErrorMessage(humanError(err));
    }
  }, [hostInput]);

  React.useEffect(() => {
    if (DEFAULT_HOST) void checkHost();
  }, [checkHost]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} className="flex-1">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={reveal(0)} className="mb-5 items-center">
            <Image
              source={MARK}
              contentFit="contain"
              accessibilityLabel="Eidolon"
              style={{ width: MARK_PX, height: MARK_PX }}
            />
            <Text className="mt-2 font-main-bold text-2xl text-text-primary tracking-tight">
              Eidolon
            </Text>
            <Text className="mt-1 text-center font-ui text-xs text-text-muted">
              {CONNECT_COPY.subtitle}
            </Text>
          </Animated.View>

          <Animated.View entering={reveal(1)}>
            {addressOpen ? (
              <Card className="flex-col gap-1.5">
                <Text className="font-ui text-xs text-text-muted">{CONNECT_COPY.addressLabel}</Text>
                <Input
                  leading={HardDriveIcon}
                  placeholder={DEFAULT_HOST || "192.168.1.39:3000"}
                  value={hostInput}
                  onChangeText={(next) => {
                    setHostInput(next);
                    setReach("unknown");
                    setErrorMessage(null);
                  }}
                  onBlur={() => void checkHost()}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={!DEFAULT_HOST}
                  editable={reach !== "checking"}
                  returnKeyType="done"
                  onSubmitEditing={() => void checkHost()}
                />
                <HostStatus reach={reach} reduced={reduced} theme={theme} />
              </Card>
            ) : (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${CONNECT_COPY.addressLabel}: ${hostInput}. ${CONNECT_COPY.changeAddress}`}
                hitSlop={8}
                onPress={() => setAddressOpen(true)}
                className="flex-row items-center justify-center gap-1.5 py-1"
              >
                <AppIcon
                  icon={reach === "reachable" ? CheckmarkCircle01Icon : HardDriveIcon}
                  size={12}
                  color={reach === "reachable" ? theme.success : theme.textMuted}
                  strokeWidth={1.6}
                />
                <Text className="font-ui text-[11px] text-text-muted" numberOfLines={1}>
                  {hostInput}
                </Text>
                <Text className="font-ui-bold text-[11px]" style={{ color: theme.primary }}>
                  {CONNECT_COPY.changeAddress}
                </Text>
              </PressableScale>
            )}
          </Animated.View>

          {errorMessage ? (
            <Animated.View
              entering={
                reduced ? FadeIn.duration(UI_MS.revealReduced) : FadeInDown.duration(UI_MS.reveal)
              }
            >
              <Card className="mt-3 flex-row items-start gap-2 border-danger">
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

          <Animated.View entering={reveal(2)}>
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

function HostStatus({
  reach,
  reduced,
  theme,
}: {
  reach: Reach;
  reduced: boolean;
  theme: ReturnType<typeof useResolvedTheme>;
}) {
  if (reach === "unknown") {
    return <Text className="font-ui text-[11px] text-text-muted">{CONNECT_COPY.addressHint}</Text>;
  }

  if (reach === "checking") {
    return (
      <View className="flex-row items-center gap-1.5">
        <ActivityIndicator size="small" color={theme.textMuted} />
        <Text className="font-ui text-[11px] text-text-muted">{CONNECT_COPY.checking}</Text>
      </View>
    );
  }

  if (reach === "unreachable") {
    return <Text className="font-ui text-[11px] text-text-muted">{CONNECT_COPY.addressHint}</Text>;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(reduced ? UI_MS.revealReduced : UI_MS.disclosure)}
      className="flex-row items-center gap-1.5"
    >
      <AppIcon icon={CheckmarkCircle01Icon} size={13} color={theme.success} />
      <Text className="font-ui-medium text-[11px] text-success">{CONNECT_COPY.reachable}</Text>
    </Animated.View>
  );
}
