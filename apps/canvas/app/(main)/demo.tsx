import type { ThemeTokens } from "@eidolon/tokens";
import {
  ArrowLeft01Icon,
  ArrowReloadHorizontalIcon,
  ColorPickerIcon,
  Moon02Icon,
  PaintBoardIcon,
  SparklesIcon,
  Sun02Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { vars } from "nativewind";
import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { ColorPickerModal } from "@/components/theme/ColorPickerModal";
import { ThemeStudioSheet } from "@/components/theme/ThemeStudioSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";
import { loadDynamicFont } from "@/services/font-registry";
import { useThemeStore } from "@/store/theme-store";

const ACCENT_PRESETS = [
  { name: "Amber", hex: "#F59E0B" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Violet", hex: "#8B5CF6" },
];

const SECONDARY_PRESETS = [
  { name: "Charcoal", hex: "#242630" },
  { name: "Slate", hex: "#334155" },
  { name: "Navy Tint", hex: "#1E293B" },
  { name: "Emerald Night", hex: "#132B22" },
  { name: "Crimson Shadow", hex: "#2E141E" },
  { name: "Ash", hex: "#374151" },
];

const CARD_PRESETS = [
  { name: "Midnight", hex: "#18191E" },
  { name: "Slate", hex: "#1E293B" },
  { name: "Obsidian", hex: "#12131A" },
  { name: "Emerald Tint", hex: "#0F241C" },
  { name: "Violet Tint", hex: "#1D172E" },
  { name: "Pure Black", hex: "#000000" },
];

const BORDER_PRESETS = [
  { name: "Subtle", hex: "#2A2C37" },
  { name: "Slate", hex: "#334155" },
  { name: "Cyan Glow", hex: "#06B6D4" },
  { name: "Amber Glow", hex: "#F59E0B" },
  { name: "Ruby Glow", hex: "#F43F5E" },
];

const CANVAS_PRESETS = [
  { name: "Graphite", hex: "#0D0E11" },
  { name: "Pure Black", hex: "#000000" },
  { name: "Deep Navy", hex: "#0B0F1A" },
  { name: "Charcoal", hex: "#1A1C23" },
];

const FONT_PRESETS = [
  {
    name: "Nunito Sans (Default)",
    main: "NunitoSans-Regular",
    mainBold: "NunitoSans-Bold",
  },
  {
    name: "Public Sans (Technical)",
    main: "PublicSans-Regular",
    mainBold: "PublicSans-Bold",
  },
  {
    name: "System Serif (Literary)",
    main: "serif",
    mainBold: "serif",
  },
  {
    name: "Monospace (Terminal)",
    main: "monospace",
    mainBold: "monospace",
  },
];

const RADIUS_PRESETS = [
  { label: "0px (Sharp)", value: 0 },
  { label: "8px (Subtle)", value: 8 },
  { label: "10px (Default)", value: 10 },
  { label: "14px (Smooth)", value: 14 },
  { label: "22px (Deep)", value: 22 },
];

export default function DynamicDemoScreen() {
  const router = useRouter();
  const {
    getResolvedTheme,
    getDynamicCssVars,
    updateGlobalToken,
    resetGlobalTheme,
    setColorMode,
    toggleColorMode,
  } = useThemeStore();

  const resolvedTheme = getResolvedTheme();
  const dynamicTheme = vars(getDynamicCssVars());

  const [showStudio, setShowStudio] = React.useState(false);
  const [isOtaLoading, setIsOtaLoading] = React.useState(false);
  const [otaStatus, setOtaStatus] = React.useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = React.useState<{
    title: string;
    tokenKey: keyof ThemeTokens;
    initialColor: string;
  } | null>(null);

  const handleDownloadRetroFont = async () => {
    setIsOtaLoading(true);
    setOtaStatus("Downloading PressStart2P from CDN...");

    const success = await loadDynamicFont(
      "PressStart2P-Regular",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
    );

    setIsOtaLoading(false);
    if (success) {
      updateGlobalToken("fontMain", "PressStart2P-Regular");
      setOtaStatus("PressStart2P loaded & applied!");
    } else {
      setOtaStatus("Failed to download font.");
    }
  };

  const handleResetDefaults = () => {
    resetGlobalTheme();
  };

  return (
    <View style={dynamicTheme} className="flex-1 bg-canvas will-change-variable">
      <SafeAreaView style={{ flex: 1 }} className="flex-1">
        {/* Top Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
            onPress={() => router.back()}
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={resolvedTheme.textPrimary} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <AppIcon icon={ColorPickerIcon} size={18} color={resolvedTheme.primary} />
            <Text className="font-main-bold text-base text-text-primary">Theme & Font Lab</Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
              onPress={() => toggleColorMode()}
            >
              <AppIcon
                icon={resolvedTheme.mode === "light" ? Moon02Icon : Sun02Icon}
                size={18}
                color={resolvedTheme.primary}
              />
            </Pressable>

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
              onPress={() => setShowStudio(true)}
            >
              <AppIcon icon={PaintBoardIcon} size={18} color={resolvedTheme.primary} />
            </Pressable>

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
              onPress={handleResetDefaults}
            >
              <AppIcon icon={ArrowReloadHorizontalIcon} size={18} color={resolvedTheme.textMuted} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Appearance Mode (Dark / Light) */}
          <View className="rounded-card border border-border bg-card p-3.5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Appearance Mode
              </Text>
              <Badge variant={resolvedTheme.mode === "light" ? "success" : "muted"}>
                {resolvedTheme.mode === "light" ? "Light Mode Active" : "Dark Mode Active"}
              </Badge>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-button border py-2.5 ${
                  resolvedTheme.mode === "dark"
                    ? "bg-primary border-primary"
                    : "border-border bg-input active:bg-border"
                }`}
                onPress={() => setColorMode("dark")}
              >
                <AppIcon
                  icon={Moon02Icon}
                  size={16}
                  color={
                    resolvedTheme.mode === "dark"
                      ? resolvedTheme.primaryForeground
                      : resolvedTheme.textMuted
                  }
                />
                <Text
                  className={`font-ui-medium text-xs ${
                    resolvedTheme.mode === "dark"
                      ? "font-bold text-primary-foreground"
                      : "text-text-muted"
                  }`}
                >
                  Dark Mode
                </Text>
              </Pressable>

              <Pressable
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-button border py-2.5 ${
                  resolvedTheme.mode === "light"
                    ? "bg-primary border-primary"
                    : "border-border bg-input active:bg-border"
                }`}
                onPress={() => setColorMode("light")}
              >
                <AppIcon
                  icon={Sun02Icon}
                  size={16}
                  color={
                    resolvedTheme.mode === "light"
                      ? resolvedTheme.primaryForeground
                      : resolvedTheme.textMuted
                  }
                />
                <Text
                  className={`font-ui-medium text-xs ${
                    resolvedTheme.mode === "light"
                      ? "font-bold text-primary-foreground"
                      : "text-text-muted"
                  }`}
                >
                  Light Mode
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section 1: Live Interactive Preview Stage */}
          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Live Dynamic Preview
              </Text>
              <Badge variant="warning">
                <Text className="font-ui-bold text-xs text-primary">
                  {`Radius: ${resolvedTheme.radius}px • ${resolvedTheme.fontMain.split("-")[0]}`}
                </Text>
              </Badge>
            </View>

            <Card className="p-5">
              <CardHeader className="flex-row items-center gap-3 pb-3">
                <Avatar size={48} className="border-2 border-primary">
                  <AvatarFallback>
                    <Text className="font-main-bold text-sm text-primary">EM</Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <CardTitle>Emma (Stage Dialogue)</CardTitle>
                  <CardDescription>Dynamic Themed Persona</CardDescription>
                </View>
              </CardHeader>

              <CardContent className="gap-2">
                <Text className="font-main text-sm leading-6 text-text-primary">
                  "Testing dynamic typography in Eidolon. Every dialogue balloon, narration tone,
                  and accent color can shift in real time to match my mood or stage context."
                </Text>

                <View className="mt-2 flex-row flex-wrap gap-2">
                  <Badge variant="success">Active Turn</Badge>
                  <Badge variant="default">TTS Streaming</Badge>
                  <Badge variant="muted">Confidence 0.98</Badge>
                </View>
              </CardContent>

              <CardFooter className="mt-2 flex-row gap-2.5">
                <Button variant="default" className="flex-1">
                  Primary Action
                </Button>
                <Button variant="secondary" className="flex-1">
                  Secondary Action
                </Button>
              </CardFooter>
            </Card>
          </View>

          {/* Section 2: Corner Radius Range Slider & Stepper */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Corner Radius (--radius)
              </Text>
              <Text className="font-ui-bold text-sm text-primary">{resolvedTheme.radius}px</Text>
            </View>

            {/* Interactive Range Slider */}
            <View className="my-2">
              <RangeSlider
                value={resolvedTheme.radius}
                min={0}
                max={40}
                step={1}
                accentColor={resolvedTheme.primary}
                onChange={(r) => updateGlobalToken("radius", r)}
              />
            </View>

            {/* Quick Presets */}
            <View className="mt-2 flex-row gap-2">
              {RADIUS_PRESETS.map((preset) => {
                const isSelected = resolvedTheme.radius === preset.value;
                return (
                  <Pressable
                    key={preset.value}
                    className={`flex-1 items-center rounded-button border p-2.5 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("radius", preset.value)}
                  >
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.label.split(" ")[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 3: Primary Accent Color (--primary) */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Primary Button & Accent (--primary)
              </Text>
              <Text className="font-ui-bold text-xs text-primary">{resolvedTheme.primary}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = resolvedTheme.primary.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <Pressable
                    key={preset.hex}
                    className={`flex-row items-center gap-2 rounded-button border px-3 py-2 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("primary", preset.hex)}
                  >
                    <View
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Custom Hex (e.g. #38BDF8)"
                  value={resolvedTheme.primary}
                  onChangeText={(hex) => updateGlobalToken("primary", hex)}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                style={{ backgroundColor: resolvedTheme.primary }}
                onPress={() =>
                  setPickerTarget({
                    title: "Pick Primary Accent Color",
                    tokenKey: "primary",
                    initialColor: resolvedTheme.primary,
                  })
                }
              >
                <AppIcon icon={ColorPickerIcon} size={18} color="#000000" />
              </Pressable>
            </View>
          </View>

          {/* Section 4: Secondary Action Button Color (--secondary) */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Secondary Button Color (--secondary)
              </Text>
              <Text className="font-ui-bold text-xs text-primary">{resolvedTheme.secondary}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {SECONDARY_PRESETS.map((preset) => {
                const isSelected =
                  resolvedTheme.secondary.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <Pressable
                    key={preset.hex}
                    className={`flex-row items-center gap-2 rounded-button border px-3 py-2 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("secondary", preset.hex)}
                  >
                    <View
                      className="h-3.5 w-3.5 rounded-full border border-border"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Custom Hex (e.g. #242630)"
                  value={resolvedTheme.secondary}
                  onChangeText={(hex) => updateGlobalToken("secondary", hex)}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                style={{ backgroundColor: resolvedTheme.secondary }}
                onPress={() =>
                  setPickerTarget({
                    title: "Pick Secondary Action Button Color",
                    tokenKey: "secondary",
                    initialColor: resolvedTheme.secondary,
                  })
                }
              >
                <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Section 5: Card Surface Color (--card) */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Card Surface (--card)
              </Text>
              <Text className="font-ui-bold text-xs text-text-primary">{resolvedTheme.card}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {CARD_PRESETS.map((preset) => {
                const isSelected = resolvedTheme.card.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <Pressable
                    key={preset.hex}
                    className={`flex-row items-center gap-2 rounded-button border px-3 py-2 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("card", preset.hex)}
                  >
                    <View
                      className="h-3.5 w-3.5 rounded-full border border-border"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Custom Hex (e.g. #18191E)"
                  value={resolvedTheme.card}
                  onChangeText={(hex) => updateGlobalToken("card", hex)}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                style={{ backgroundColor: resolvedTheme.card }}
                onPress={() =>
                  setPickerTarget({
                    title: "Pick Card Background Color",
                    tokenKey: "card",
                    initialColor: resolvedTheme.card,
                  })
                }
              >
                <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Section 6: Card Border Color (--card-border) */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Card & Element Border (--card-border)
              </Text>
              <Text className="font-ui-bold text-xs text-text-primary">
                {resolvedTheme.cardBorder}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {BORDER_PRESETS.map((preset) => {
                const isSelected =
                  resolvedTheme.cardBorder.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <Pressable
                    key={preset.hex}
                    className={`flex-row items-center gap-2 rounded-button border px-3 py-2 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("cardBorder", preset.hex)}
                  >
                    <View
                      className="h-3.5 w-3.5 rounded-full border border-border"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Custom Hex (e.g. #2A2C37)"
                  value={resolvedTheme.cardBorder}
                  onChangeText={(hex) => updateGlobalToken("cardBorder", hex)}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                style={{ backgroundColor: resolvedTheme.cardBorder }}
                onPress={() =>
                  setPickerTarget({
                    title: "Pick Card Border Color",
                    tokenKey: "cardBorder",
                    initialColor: resolvedTheme.cardBorder,
                  })
                }
              >
                <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Section 7: Canvas Background Selector */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Canvas Surface (--canvas)
              </Text>
              <Text className="font-ui-bold text-xs text-text-primary">{resolvedTheme.canvas}</Text>
            </View>

            <View className="flex-row gap-2">
              {CANVAS_PRESETS.map((preset) => {
                const isSelected = resolvedTheme.canvas === preset.hex;
                return (
                  <Pressable
                    key={preset.hex}
                    className={`flex-1 items-center rounded-button border p-2.5 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("canvas", preset.hex)}
                  >
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {preset.name}
                    </Text>
                    <Text className="mt-0.5 font-ui text-[10px] text-text-muted">{preset.hex}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 8: Font Family Selector */}
          <View className="rounded-card border border-border bg-card p-4">
            <Text className="mb-2 font-ui-bold text-xs uppercase tracking-wider text-text-muted">
              Dialogue Font Family (--font-main)
            </Text>
            <View className="flex-col gap-2">
              {FONT_PRESETS.map((preset) => {
                const isSelected = resolvedTheme.fontMain === preset.main;
                return (
                  <Pressable
                    key={preset.name}
                    className={`flex-row items-center justify-between rounded-button border px-4 py-3 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateGlobalToken("fontMain", preset.main)}
                  >
                    <View>
                      <Text
                        className={`font-ui text-xs ${
                          isSelected ? "font-bold text-primary" : "text-text-muted"
                        }`}
                      >
                        {preset.name}
                      </Text>
                      <Text className="font-ui text-[10px] text-text-muted">
                        Active font: {preset.main}
                      </Text>
                    </View>
                    {isSelected && (
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: resolvedTheme.primary }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Dynamic OTA Font Download Trigger */}
            <View className="mt-3 rounded border border-border bg-input p-4">
              <View className="flex-row items-center gap-2">
                <AppIcon icon={SparklesIcon} size={18} color={resolvedTheme.primary} />
                <Text className="font-ui-bold text-xs text-text-primary">
                  OTA Font Registry Test
                </Text>
              </View>
              <Text className="mt-1 font-ui text-xs text-text-muted">
                Download and apply PressStart 2P (Retro 8-bit Pixel font) from Google Fonts CDN to
                test true on-demand font injection.
              </Text>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={isOtaLoading}
                onPress={handleDownloadRetroFont}
              >
                {isOtaLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="font-ui-medium text-xs text-text-primary">Downloading...</Text>
                  </View>
                ) : (
                  "Download & Apply Retro 8-Bit Font"
                )}
              </Button>
              {otaStatus && (
                <Text className="mt-2 font-ui text-[11px]" style={{ color: resolvedTheme.primary }}>
                  {otaStatus}
                </Text>
              )}
            </View>
          </View>

          {/* Section 9: Active CSS Variables Inspector */}
          <Card className="p-4">
            <Text className="font-ui-bold text-xs uppercase text-text-muted">
              Live CSS Variable Inspector
            </Text>
            <View className="mt-2 gap-1 rounded-card bg-input p-3">
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --primary:
                </Text>{" "}
                {resolvedTheme.primary}
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --secondary:
                </Text>{" "}
                {resolvedTheme.secondary}
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --card:
                </Text>{" "}
                {resolvedTheme.card}
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --card-border:
                </Text>{" "}
                {resolvedTheme.cardBorder}
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --canvas:
                </Text>{" "}
                {resolvedTheme.canvas}
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --radius:
                </Text>{" "}
                {resolvedTheme.radius}px
              </Text>
              <Text className="font-ui text-xs text-text-muted">
                <Text style={{ color: resolvedTheme.primary }} className="font-bold">
                  --font-main:
                </Text>{" "}
                {resolvedTheme.fontMain}
              </Text>
            </View>
          </Card>

          {/* Full Theme Studio Action Card */}
          <View className="rounded-card border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PaintBoardIcon} size={18} color={resolvedTheme.primary} />
              <Text className="font-ui-bold text-sm text-text-primary">
                Full Studio & Character Overrides
              </Text>
            </View>
            <Text className="mt-1 font-ui text-xs text-text-muted">
              Access character-specific overrides, master defaults promotion, and advanced semantic
              palettes.
            </Text>
            <Button variant="default" className="mt-3" onPress={() => setShowStudio(true)}>
              Open Theme Studio Modal
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Interactive Theme Studio Sheet */}
      <ThemeStudioSheet isOpen={showStudio} onClose={() => setShowStudio(false)} />

      {/* Reanimated Color Picker Modal */}
      <ColorPickerModal
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget?.title ?? ""}
        initialColor={pickerTarget?.initialColor ?? "#F59E0B"}
        onSelectColor={(hex) => {
          if (pickerTarget) {
            updateGlobalToken(pickerTarget.tokenKey, hex);
          }
        }}
      />
    </View>
  );
}
