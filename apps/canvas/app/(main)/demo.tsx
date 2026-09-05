import type { ThemeTokens } from "@eidolon/tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { VariableContextProvider } from "react-native-css";
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
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { FontFamilyPicker } from "@/components/ui/font-family-picker";
import { HexField } from "@/components/ui/hex-field";
import { RangeSlider } from "@/components/ui/range-slider";
import { ResetTokenButton } from "@/components/ui/reset-token-button";
import { TextSizeControl } from "@/components/ui/text-size-control";
import {
  ArrowLeft01Icon,
  ArrowReloadHorizontalIcon,
  ColorPickerIcon,
  Moon02Icon,
  PaintBoardIcon,
  Sun02Icon,
} from "@/lib/icons";
import { MODES } from "@/lib/theme-presets";
import {
  defaultTokenValue,
  useResolvedTheme,
  useThemeCssVars,
  useThemeStore,
} from "@/store/theme-store";

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

const RADIUS_PRESETS = [
  { label: "0px (Sharp)", value: 0 },
  { label: "8px (Subtle)", value: 8 },
  { label: "10px (Default)", value: 10 },
  { label: "14px (Smooth)", value: 14 },
  { label: "22px (Deep)", value: 22 },
];

export default function DynamicDemoScreen() {
  const router = useRouter();
  const updateGlobalToken = useThemeStore((state) => state.updateGlobalToken);
  const resetGlobalTheme = useThemeStore((state) => state.resetGlobalTheme);
  const setColorMode = useThemeStore((state) => state.setColorMode);
  const toggleColorMode = useThemeStore((state) => state.toggleColorMode);

  const resolvedTheme = useResolvedTheme();
  const cssVars = useThemeCssVars();

  // All control sections start collapsed so the live preview stays on screen
  // while editing, instead of being scrolled away by the full control list.
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
  const toggleSection = React.useCallback((key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);

  const commitPrimary = React.useCallback(
    (hex: string) => updateGlobalToken("primary", hex),
    [updateGlobalToken],
  );
  const commitSecondary = React.useCallback(
    (hex: string) => updateGlobalToken("secondary", hex),
    [updateGlobalToken],
  );
  const commitCard = React.useCallback(
    (hex: string) => updateGlobalToken("card", hex),
    [updateGlobalToken],
  );
  const commitCardBorder = React.useCallback(
    (hex: string) => updateGlobalToken("cardBorder", hex),
    [updateGlobalToken],
  );

  const [showStudio, setShowStudio] = React.useState(false);

  // Target is kept after closing so initialColor never flips to a fallback
  // while the modal is still on screen.
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerTarget, setPickerTarget] = React.useState<{
    title: string;
    tokenKey: keyof ThemeTokens;
    initialColor: string;
  } | null>(null);

  const openPicker = React.useCallback(
    (target: { title: string; tokenKey: keyof ThemeTokens; initialColor: string }) => {
      setPickerTarget(target);
      setPickerOpen(true);
    },
    [],
  );

  // react-native-css 3.0.7 caches computed styles per rule-set hash and only
  // rebuilds when a rule the element itself declares changes, so a descendant
  // reading --color-primary could keep a stale value until some unrelated token
  // (e.g. --card, which the Card itself declares) forced a rebuild. Remounting the
  // preview on any token change guarantees it always shows the current theme.
  const previewKey = React.useMemo(
    () =>
      [
        resolvedTheme.canvas,
        resolvedTheme.card,
        resolvedTheme.cardBorder,
        resolvedTheme.inputSurface,
        resolvedTheme.textPrimary,
        resolvedTheme.textMuted,
        resolvedTheme.primary,
        resolvedTheme.primaryForeground,
        resolvedTheme.secondary,
        resolvedTheme.secondaryForeground,
        resolvedTheme.success,
        resolvedTheme.warning,
        resolvedTheme.danger,
        resolvedTheme.radius,
        resolvedTheme.fontMain,
        resolvedTheme.fontUI,
        resolvedTheme.fontScale,
      ].join("|"),
    [resolvedTheme],
  );

  const resetToken = useThemeStore((state) => state.resetToken);

  const handleResetToken = React.useCallback(
    (tokenKey: keyof ThemeTokens) => resetToken(tokenKey),
    [resetToken],
  );

  const isTokenDefault = React.useCallback(
    (tokenKey: keyof ThemeTokens) =>
      resolvedTheme[tokenKey] === defaultTokenValue(tokenKey, resolvedTheme.mode),
    [resolvedTheme],
  );

  const handleResetDefaults = () => {
    resetGlobalTheme();
  };

  return (
    <VariableContextProvider value={cssVars}>
      <View className="flex-1 bg-canvas" style={{ backgroundColor: resolvedTheme.canvas }}>
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
                <AppIcon
                  icon={ArrowReloadHorizontalIcon}
                  size={18}
                  color={resolvedTheme.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Appearance Mode (Dark / Light) */}
            {/* Binary choice, so an inline segmented toggle rather than a section. */}
            <View className="flex-row items-center justify-between rounded-card border border-border bg-card px-3 py-2.5">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Appearance Mode
              </Text>
              <View className="flex-row items-center gap-1 rounded-button border border-border bg-input p-0.5">
                {MODES.map(({ mode, label, icon }) => {
                  const isActive = resolvedTheme.mode === mode;
                  return (
                    <Pressable
                      key={mode}
                      className={`flex-row items-center gap-1.5 rounded-button px-2.5 py-1.5 ${
                        isActive ? "bg-primary" : ""
                      }`}
                      onPress={() => setColorMode(mode)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <AppIcon
                        icon={icon}
                        size={14}
                        color={isActive ? resolvedTheme.primaryForeground : resolvedTheme.textMuted}
                      />
                      <Text
                        className={`font-ui-medium text-[11px] ${
                          isActive ? "font-bold text-primary-foreground" : "text-text-muted"
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 1: Live Interactive Preview Stage */}
            <View key={previewKey}>
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
            <CollapsibleSection
              sectionKey="radius"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("radius")}
                  isDefault={isTokenDefault("radius")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset corner radius to default"
                />
              }
              title="Corner Radius (--radius)"
              badge={
                <Text className="font-ui-bold text-xs text-primary">{resolvedTheme.radius}px</Text>
              }
              expanded={expandedSection === "radius"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
            </CollapsibleSection>

            {/* Section 3: Primary Accent Color (--primary) */}
            <CollapsibleSection
              sectionKey="primary"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("primary")}
                  isDefault={isTokenDefault("primary")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset primary accent to default"
                />
              }
              title="Primary Button & Accent (--primary)"
              badge={
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: resolvedTheme.primary }}
                  />
                  <Text className="font-ui-bold text-[11px] text-text-primary">
                    {resolvedTheme.primary}
                  </Text>
                </View>
              }
              expanded={expandedSection === "primary"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
              <View className="flex-row flex-wrap gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected =
                    resolvedTheme.primary.toLowerCase() === preset.hex.toLowerCase();
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
                  <HexField
                    placeholder="Custom Hex (e.g. #38BDF8)"
                    value={resolvedTheme.primary}
                    onCommit={commitPrimary}
                    maxLength={7}
                  />
                </View>
                <Pressable
                  className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                  style={{ backgroundColor: resolvedTheme.primary }}
                  onPress={() =>
                    openPicker({
                      title: "Pick Primary Accent Color",
                      tokenKey: "primary",
                      initialColor: resolvedTheme.primary,
                    })
                  }
                >
                  <AppIcon icon={ColorPickerIcon} size={18} color="#000000" />
                </Pressable>
              </View>
            </CollapsibleSection>

            {/* Section 4: Secondary Action Button Color (--secondary) */}
            <CollapsibleSection
              sectionKey="secondary"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("secondary")}
                  isDefault={isTokenDefault("secondary")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset secondary colour to default"
                />
              }
              title="Secondary Button Color (--secondary)"
              badge={
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: resolvedTheme.secondary }}
                  />
                  <Text className="font-ui-bold text-[11px] text-text-primary">
                    {resolvedTheme.secondary}
                  </Text>
                </View>
              }
              expanded={expandedSection === "secondary"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
                  <HexField
                    placeholder="Custom Hex (e.g. #242630)"
                    value={resolvedTheme.secondary}
                    onCommit={commitSecondary}
                    maxLength={7}
                  />
                </View>
                <Pressable
                  className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                  style={{ backgroundColor: resolvedTheme.secondary }}
                  onPress={() =>
                    openPicker({
                      title: "Pick Secondary Action Button Color",
                      tokenKey: "secondary",
                      initialColor: resolvedTheme.secondary,
                    })
                  }
                >
                  <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </CollapsibleSection>

            {/* Section 5: Card Surface Color (--card) */}
            <CollapsibleSection
              sectionKey="card"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("card")}
                  isDefault={isTokenDefault("card")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset card surface to default"
                />
              }
              title="Card Surface (--card)"
              badge={
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: resolvedTheme.card }}
                  />
                  <Text className="font-ui-bold text-[11px] text-text-primary">
                    {resolvedTheme.card}
                  </Text>
                </View>
              }
              expanded={expandedSection === "card"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
                  <HexField
                    placeholder="Custom Hex (e.g. #18191E)"
                    value={resolvedTheme.card}
                    onCommit={commitCard}
                    maxLength={7}
                  />
                </View>
                <Pressable
                  className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                  style={{ backgroundColor: resolvedTheme.card }}
                  onPress={() =>
                    openPicker({
                      title: "Pick Card Background Color",
                      tokenKey: "card",
                      initialColor: resolvedTheme.card,
                    })
                  }
                >
                  <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </CollapsibleSection>

            {/* Section 6: Card Border Color (--card-border) */}
            <CollapsibleSection
              sectionKey="cardBorder"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("cardBorder")}
                  isDefault={isTokenDefault("cardBorder")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset card border to default"
                />
              }
              title="Card & Element Border (--card-border)"
              badge={
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: resolvedTheme.cardBorder }}
                  />
                  <Text className="font-ui-bold text-[11px] text-text-primary">
                    {resolvedTheme.cardBorder}
                  </Text>
                </View>
              }
              expanded={expandedSection === "cardBorder"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
                  <HexField
                    placeholder="Custom Hex (e.g. #2A2C37)"
                    value={resolvedTheme.cardBorder}
                    onCommit={commitCardBorder}
                    maxLength={7}
                  />
                </View>
                <Pressable
                  className="h-11 w-11 items-center justify-center rounded-button border border-border active:opacity-75"
                  style={{ backgroundColor: resolvedTheme.cardBorder }}
                  onPress={() =>
                    openPicker({
                      title: "Pick Card Border Color",
                      tokenKey: "cardBorder",
                      initialColor: resolvedTheme.cardBorder,
                    })
                  }
                >
                  <AppIcon icon={ColorPickerIcon} size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </CollapsibleSection>

            {/* Section 7: Canvas Background Selector */}
            <CollapsibleSection
              sectionKey="canvas"
              action={
                <ResetTokenButton
                  onPress={() => handleResetToken("canvas")}
                  isDefault={isTokenDefault("canvas")}
                  color={resolvedTheme.textMuted}
                  accessibilityLabel="Reset canvas surface to default"
                />
              }
              title="Canvas Surface (--canvas)"
              badge={
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: resolvedTheme.canvas }}
                  />
                  <Text className="font-ui-bold text-[11px] text-text-primary">
                    {resolvedTheme.canvas}
                  </Text>
                </View>
              }
              expanded={expandedSection === "canvas"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
                      <Text className="mt-0.5 font-ui text-[10px] text-text-muted">
                        {preset.hex}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Section 8: Font Family Selector */}
            <CollapsibleSection
              sectionKey="font"
              title="Typography"
              expanded={expandedSection === "font"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
              <View className="gap-4">
                <TextSizeControl
                  value={resolvedTheme.fontScale}
                  onChange={(scale) => updateGlobalToken("fontScale", scale)}
                  onReset={() => handleResetToken("fontScale")}
                  isDefault={isTokenDefault("fontScale")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
                <FontFamilyPicker
                  label="Dialogue (--font-main)"
                  value={resolvedTheme.fontMain}
                  onSelect={(family) => updateGlobalToken("fontMain", family)}
                  onReset={() => handleResetToken("fontMain")}
                  isDefault={isTokenDefault("fontMain")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
                <FontFamilyPicker
                  label="Interface (--font-ui)"
                  value={resolvedTheme.fontUI}
                  onSelect={(family) => updateGlobalToken("fontUI", family)}
                  onReset={() => handleResetToken("fontUI")}
                  isDefault={isTokenDefault("fontUI")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
              </View>
            </CollapsibleSection>

            {/* Section 9: Active CSS Variables Inspector */}
            <CollapsibleSection
              sectionKey="inspector"
              title="Live CSS Variable Inspector"
              expanded={expandedSection === "inspector"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
            >
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
            </CollapsibleSection>

            {/* Full Theme Studio Action Card */}
            <View className="rounded-card border border-border bg-card p-4">
              <View className="flex-row items-center gap-2">
                <AppIcon icon={PaintBoardIcon} size={18} color={resolvedTheme.primary} />
                <Text className="font-ui-bold text-sm text-text-primary">
                  Full Studio & Character Overrides
                </Text>
              </View>
              <Text className="mt-1 font-ui text-xs text-text-muted">
                Access character-specific overrides, master defaults promotion, and advanced
                semantic palettes.
              </Text>
              <Button variant="default" className="mt-3" onPress={() => setShowStudio(true)}>
                Open Theme Studio Modal
              </Button>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Interactive Theme Studio Sheet */}
        <ThemeStudioSheet isOpen={showStudio} onClose={() => setShowStudio(false)} />

        <ColorPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={pickerTarget?.title ?? ""}
          initialColor={pickerTarget?.initialColor ?? "#F59E0B"}
          onSelectColor={(hex) => {
            if (pickerTarget) {
              updateGlobalToken(pickerTarget.tokenKey, hex as never);
            }
          }}
        />
      </View>
    </VariableContextProvider>
  );
}
