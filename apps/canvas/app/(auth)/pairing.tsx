import { ArrowDown01Icon, ArrowUp01Icon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConnectionStore } from "@/store/connection";
import { useThemeStore } from "@/store/theme-store";

export default function PairingScreen() {
  const router = useRouter();
  const { pairFromUri, setManualConnection } = useConnectionStore();
  const { getResolvedTheme, activeCharacterId } = useThemeStore();
  const theme = getResolvedTheme(activeCharacterId ?? undefined);
  const [permission, requestPermission] = useCameraPermissions();

  const [isManualOpen, setIsManualOpen] = React.useState(false);
  const [hostInput, setHostInput] = React.useState("");
  const [tokenInput, setTokenInput] = React.useState("");
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const scanLock = React.useRef(false);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLock.current || isConnecting) return;

    const data = result.data?.trim();
    if (!data?.startsWith("eidolon://pair")) return;

    scanLock.current = true;
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      await pairFromUri(data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(main)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pairing failed. Host unreachable.";
      setErrorMessage(msg);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Haptics fallback
      }
      setTimeout(() => {
        scanLock.current = false;
        setIsConnecting(false);
      }, 2500);
    }
  };

  const handleManualConnect = async () => {
    if (!hostInput.trim() || !tokenInput.trim()) {
      setErrorMessage("Please enter both server host and pairing token.");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      await setManualConnection(hostInput, tokenInput);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(main)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed. Host unreachable.";
      setErrorMessage(msg);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Haptics fallback
      }
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="font-main-bold text-2xl text-text-primary tracking-tight">
              Link to Conductor
            </Text>
            <Text className="mt-1 text-center font-ui text-sm text-text-muted">
              Scan the QR code printed on your desktop terminal
            </Text>
          </View>

          {/* Camera Viewfinder */}
          <View className="items-center justify-center">
            <View className="h-72 w-72 overflow-hidden rounded-card border border-border bg-card">
              {permission?.granted && Platform.OS !== "web" ? (
                <View className="relative h-full w-full">
                  <CameraView
                    style={{ width: "100%", height: "100%" }}
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                  {/* Viewfinder Target Border Overlay */}
                  <View className="pointer-events-none absolute inset-4 rounded-button border-2 border-primary" />
                  {isConnecting && (
                    <View className="absolute inset-0 items-center justify-center bg-canvas/80">
                      <ActivityIndicator size="large" color={theme.primary} />
                      <Text className="mt-3 font-ui-medium text-sm text-text-primary">
                        Connecting to Conductor...
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="flex-1 items-center justify-center p-6">
                  <AppIcon icon={QrCodeIcon} size={48} color={theme.textMuted} />
                  <Text className="mt-3 text-center font-ui text-xs text-text-muted">
                    Camera permission is required to scan pairing QR codes.
                  </Text>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4"
                    onPress={() => requestPermission()}
                  >
                    Grant Permission
                  </Button>
                </View>
              )}
            </View>
          </View>

          {/* Error Message Toast/Banner */}
          {errorMessage && (
            <Card className="mt-4 border-danger bg-card">
              <Text className="font-ui-medium text-xs text-danger">{errorMessage}</Text>
            </Card>
          )}

          {/* Manual Connection Section */}
          <View className="mt-6">
            <Pressable
              className="flex-row items-center justify-between rounded-button border border-border bg-card px-4 py-3"
              onPress={() => setIsManualOpen((prev) => !prev)}
            >
              <Text className="font-ui-medium text-sm text-text-primary">Enter Manually</Text>
              <AppIcon
                icon={isManualOpen ? ArrowUp01Icon : ArrowDown01Icon}
                size={18}
                color={theme.textMuted}
              />
            </Pressable>

            {isManualOpen && (
              <Card className="mt-2 flex-col gap-3">
                <View>
                  <Text className="mb-1 font-ui text-xs text-text-muted">Server Host & Port</Text>
                  <Input
                    placeholder="192.168.1.39:3000"
                    value={hostInput}
                    onChangeText={setHostInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View>
                  <Text className="mb-1 font-ui text-xs text-text-muted">Pairing Secret Token</Text>
                  <Input
                    placeholder="e.g. eidolon_dev_secret_key"
                    value={tokenInput}
                    onChangeText={setTokenInput}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Button
                  variant="default"
                  className="mt-1"
                  disabled={isConnecting}
                  onPress={handleManualConnect}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              </Card>
            )}

            {/* Quick Demo Access */}
            <Pressable
              className="mt-6 items-center rounded-button border border-border bg-card p-3 active:bg-border"
              onPress={() => router.push("/demo")}
            >
              <Text className="font-ui-medium text-xs text-primary">
                Explore Theme & Font Lab (Demo Mode) →
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
