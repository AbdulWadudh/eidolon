import { AUTH } from "@eidolon/config";
import { Redirect, Stack } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { useAuthStore } from "@/store/auth-store";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function AdminLayout() {
  const theme = useResolvedTheme();
  const { serverHost, pairingToken } = useConnectionStore();
  const account = useAuthStore((state) => state.account);
  const isResolved = useAuthStore((state) => state.isResolved);
  const refresh = useAuthStore((state) => state.refresh);

  React.useEffect(() => {
    void refresh(serverHost, pairingToken);
  }, [refresh, serverHost, pairingToken]);

  if (!isResolved) {
    return <View style={{ flex: 1, backgroundColor: theme.canvas }} />;
  }

  if (account?.role !== AUTH.ownerRole) {
    return <Redirect href="/(main)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.canvas },
        animation: "fade",
      }}
    />
  );
}
