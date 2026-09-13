import { DASHBOARD_COPY } from "@eidolon/config";
import { useRouter } from "expo-router";
import type * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { LoadingState } from "@/components/common/loading-state";
import { PressableScale } from "@/components/common/pressable-scale";
import { Card } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ArrowLeft01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface AdminScreenProps {
  title: string;
  blurb: string;
  isLoading?: boolean;
  error?: string | null;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminScreen({
  title,
  blurb,
  isLoading = false,
  error = null,
  trailing,
  children,
}: AdminScreenProps) {
  const router = useRouter();
  const theme = useResolvedTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      <View className="flex-row items-center gap-3 border-b border-border px-4 py-2.5">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.back}
          hitSlop={12}
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-button border border-border"
        >
          <AppIcon icon={ArrowLeft01Icon} size={16} color={theme.textPrimary} />
        </PressableScale>

        <View className="flex-1">
          <Text className="font-main-bold text-lg text-text-primary tracking-tight">{title}</Text>
          <Text className="font-ui text-[11px] text-text-muted" numberOfLines={1}>
            {blurb}
          </Text>
        </View>

        {trailing}
      </View>

      {isLoading ? (
        <LoadingState label={DASHBOARD_COPY.loading} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <Card className="border-danger">
              <Text accessibilityLiveRegion="polite" className="font-ui-medium text-xs text-danger">
                {error}
              </Text>
            </Card>
          ) : null}
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export function AdminEmpty({ label = DASHBOARD_COPY.empty }: { label?: string }) {
  return (
    <GlassSurface
      tint="card"
      className="overflow-hidden rounded-card border border-border px-4 py-6"
    >
      <Text className="text-center font-main text-sm text-text-muted">{label}</Text>
    </GlassSurface>
  );
}
