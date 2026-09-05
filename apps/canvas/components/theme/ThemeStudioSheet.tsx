import type { ThemeTokens } from "@eidolon/tokens";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  ColorPickerIcon,
  Moon02Icon,
  PaintBoardIcon,
  SparklesIcon,
  Sun02Icon,
} from "@hugeicons/core-free-icons";
import { vars } from "nativewind";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { ColorPickerModal } from "@/components/theme/ColorPickerModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RangeSlider } from "@/components/ui/range-slider";
import { useThemeStore } from "@/store/theme-store";

export interface ThemeStudioSheetProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
  characterName?: string;
}

const RADIUS_PRESETS = [0, 8, 10, 14, 22];

const COLOR_SWATCHES = [
  { name: "Amber", hex: "#F59E0B" },
  { name: "Ruby", hex: "#E11D48" },
  { name: "Jade", hex: "#10B981" },
  { name: "Lapis", hex: "#2563EB" },
  { name: "Amethyst", hex: "#8B5CF6" },
  { name: "Slate", hex: "#64748B" },
  { name: "Black", hex: "#000000" },
];

interface ColorFieldProps {
  label: string;
  tokenKey: keyof ThemeTokens;
  value: string;
  onChange: (val: string) => void;
  onOpenPicker?: () => void;
  theme: ThemeTokens;
}

function ColorField({ label, tokenKey, value, onChange, onOpenPicker, theme }: ColorFieldProps) {
  const [localHex, setLocalHex] = React.useState(value);

  React.useEffect(() => {
    setLocalHex(value);
  }, [value]);

  const handleHexChange = (text: string) => {
    let clean = text.trim();
    if (!clean.startsWith("#") && clean.length > 0) {
      clean = `#${clean}`;
    }
    setLocalHex(clean);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(clean)) {
      onChange(clean.toUpperCase());
    }
  };

  return (
    <View className="mb-3 rounded-button border border-border bg-input p-2.5">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className="h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: value }}
          />
          <Text className="font-ui-medium text-xs text-text-primary">{label}</Text>
        </View>
        <Text className="font-ui text-[10px] text-text-muted">--{tokenKey}</Text>
      </View>

      {/* Swatches */}
      <View className="mb-2 flex-row flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <Pressable
              key={swatch.hex}
              className="h-6 w-6 items-center justify-center rounded-full border"
              style={{
                backgroundColor: swatch.hex,
                borderColor: isSelected ? theme.primary : theme.cardBorder,
                borderWidth: isSelected ? 2 : 1,
              }}
              onPress={() => onChange(swatch.hex)}
            >
              {isSelected && (
                <AppIcon
                  icon={CheckmarkCircle01Icon}
                  size={12}
                  color={swatch.hex === "#000000" ? "#FFFFFF" : "#000000"}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Direct Hex Input + Color Wheel Trigger */}
      <View className="flex-row items-center gap-2">
        <TextInput
          value={localHex}
          onChangeText={handleHexChange}
          placeholder="#HEX"
          placeholderTextColor={theme.textMuted}
          className="h-8 flex-1 rounded border border-border bg-card px-2 font-ui text-xs text-text-primary"
          autoCapitalize="characters"
          maxLength={9}
        />
        <Pressable
          className="h-8 w-8 items-center justify-center rounded border border-border active:opacity-75"
          style={{ backgroundColor: value }}
          onPress={onOpenPicker}
        >
          <AppIcon
            icon={ColorPickerIcon}
            size={14}
            color={value.toLowerCase() === "#ffffff" ? "#000000" : "#FFFFFF"}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function ThemeStudioSheet({
  isOpen,
  onClose,
  characterId = "emma",
  characterName = "Emma",
}: ThemeStudioSheetProps) {
  const {
    characterThemes,
    getResolvedTheme,
    getDynamicCssVars,
    updateGlobalToken,
    updateCharacterToken,
    resetCharacterTheme,
    promoteCharacterToGlobal,
    resetGlobalTheme,
    setColorMode,
  } = useThemeStore();

  const [scope, setScope] = React.useState<"global" | "character">("global");
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({
    surfaces: false,
    accents: false,
    semantics: false,
  });

  const [pickerTarget, setPickerTarget] = React.useState<{
    title: string;
    tokenKey: keyof ThemeTokens;
    initialColor: string;
  } | null>(null);

  const targetCharacterId = characterId || "emma";
  const resolvedTheme = getResolvedTheme(scope === "character" ? targetCharacterId : undefined);
  const characterHasOverrides = Boolean(
    characterThemes[targetCharacterId] &&
      Object.keys(characterThemes[targetCharacterId]).length > 0,
  );

  const previewCssVars = getDynamicCssVars(scope === "character" ? targetCharacterId : undefined);

  const handleSetColorMode = (mode: "dark" | "light") => {
    setColorMode(mode, scope === "character" ? targetCharacterId : undefined);
  };

  const updateToken = <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => {
    if (scope === "global") {
      updateGlobalToken(key, value);
    } else {
      updateCharacterToken(targetCharacterId, key, value);
    }
  };

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleRadiusChange = (text: string) => {
    const parsed = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 60) {
      updateToken("radius", parsed);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView
        style={[vars(previewCssVars), { flex: 1, backgroundColor: resolvedTheme.canvas }]}
        className="flex-1 bg-canvas will-change-variable"
      >
        {/* Header Bar */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={PaintBoardIcon} size={20} color={resolvedTheme.primary} />
            <Text className="font-main-bold text-lg text-text-primary">Theme Studio</Text>
          </View>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-button border border-border bg-card active:bg-border"
            onPress={onClose}
          >
            <AppIcon icon={Cancel01Icon} size={18} color={resolvedTheme.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* A. Scope Selector */}
          <View className="rounded-card border border-border bg-card p-3">
            <Text className="mb-2 font-ui-bold text-xs uppercase tracking-wider text-text-muted">
              Theme Scope
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className={`flex-1 items-center rounded-button border py-2 ${
                  scope === "global" ? "bg-primary" : "border-border bg-input"
                }`}
                onPress={() => setScope("global")}
              >
                <Text
                  className={`font-ui-medium text-xs ${
                    scope === "global" ? "text-primary-foreground font-bold" : "text-text-muted"
                  }`}
                >
                  Global Master Default
                </Text>
              </Pressable>

              <Pressable
                className={`flex-1 items-center rounded-button border py-2 ${
                  scope === "character" ? "bg-primary" : "border-border bg-input"
                }`}
                onPress={() => setScope("character")}
              >
                <Text
                  className={`font-ui-medium text-xs ${
                    scope === "character" ? "text-primary-foreground font-bold" : "text-text-muted"
                  }`}
                >
                  {characterName} Override
                </Text>
              </Pressable>
            </View>

            {scope === "character" && (
              <View className="mt-3 flex-row items-center justify-between border-t border-border pt-2">
                <Text className="font-ui text-xs text-text-muted">Status</Text>
                <Badge variant={characterHasOverrides ? "warning" : "muted"}>
                  {characterHasOverrides ? "Custom Overrides Active" : "Inheriting Global Master"}
                </Badge>
              </View>
            )}
          </View>

          {/* B. Color Appearance Mode (Dark / Light) */}
          <View className="rounded-card border border-border bg-card p-3">
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
                onPress={() => handleSetColorMode("dark")}
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
                onPress={() => handleSetColorMode("light")}
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

          {/* D. Live Interactive Preview Card */}
          <View style={vars(previewCssVars)}>
            <Text className="mb-2 font-ui-bold text-xs uppercase tracking-wider text-text-muted">
              Live Cascading Preview
            </Text>
            <Card className="p-4 shadow-none">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-9 w-9 items-center justify-center rounded-full border border-primary bg-input">
                    <Text className="font-main-bold text-xs text-primary">
                      {characterName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-main-bold text-sm text-text-primary">
                      {scope === "character" ? characterName : "Master Persona"}
                    </Text>
                    <Text className="font-ui text-[11px] text-text-muted">
                      Radius: {resolvedTheme.radius}px • Accent: {resolvedTheme.primary}
                    </Text>
                  </View>
                </View>
                <Badge variant="success">Online</Badge>
              </View>

              <Text className="font-main text-xs text-text-primary leading-5">
                "Every balloon, border, surface, and semantic indicator shifts instantaneously via
                our dynamic CSS variable engine."
              </Text>

              <View className="mt-3 flex-row items-center gap-2">
                <Badge variant="success">Stage Active</Badge>
                <Badge variant="danger">TTS Alert</Badge>
              </View>

              <View className="mt-3 flex-row gap-2">
                <Button variant="default" size="sm" className="flex-1">
                  Primary Action
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">
                  Secondary Action
                </Button>
              </View>
            </Card>
          </View>

          {/* B. Geometry & Corner Radius */}
          <View className="rounded-card border border-border bg-card p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-muted">
                Corner Radius (--radius)
              </Text>
              <Text className="font-ui-bold text-xs text-primary">{resolvedTheme.radius}px</Text>
            </View>

            {/* Interactive Range Slider */}
            <View className="mb-3">
              <RangeSlider
                value={resolvedTheme.radius}
                min={0}
                max={40}
                step={1}
                accentColor={resolvedTheme.primary}
                onChange={(val) => updateToken("radius", val)}
              />
            </View>

            {/* Quick Presets */}
            <View className="mb-3 flex-row gap-1.5">
              {RADIUS_PRESETS.map((r) => {
                const isSelected = resolvedTheme.radius === r;
                return (
                  <Pressable
                    key={r}
                    className={`flex-1 items-center rounded border py-1.5 ${
                      isSelected ? "border-primary bg-input" : "border-border bg-input"
                    }`}
                    onPress={() => updateToken("radius", r)}
                  >
                    <Text
                      className={`font-ui text-xs ${
                        isSelected ? "font-bold text-primary" : "text-text-muted"
                      }`}
                    >
                      {r}px
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Direct Numeric Input + Stepper */}
            <View className="flex-row items-center gap-2">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded border border-border bg-input"
                onPress={() => updateToken("radius", Math.max(0, resolvedTheme.radius - 1))}
              >
                <Text className="font-ui-bold text-base text-text-primary">-</Text>
              </Pressable>

              <View className="flex-1">
                <TextInput
                  value={String(resolvedTheme.radius)}
                  onChangeText={handleRadiusChange}
                  keyboardType="numeric"
                  className="h-10 rounded border border-border bg-input px-3 font-ui-bold text-sm text-text-primary"
                  style={{ textAlign: "center" }}
                  placeholder="e.g. 22"
                  placeholderTextColor={resolvedTheme.textMuted}
                />
              </View>

              <Pressable
                className="h-10 w-10 items-center justify-center rounded border border-border bg-input"
                onPress={() => updateToken("radius", Math.min(60, resolvedTheme.radius + 1))}
              >
                <Text className="font-ui-bold text-base text-text-primary">+</Text>
              </Pressable>
            </View>
          </View>

          {/* C. Color Variables Controls */}
          {/* 1. Surfaces */}
          <View className="rounded-card border border-border bg-card p-3">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => toggleSection("surfaces")}
            >
              <View className="flex-row items-center gap-2">
                <AppIcon icon={ColorPickerIcon} size={16} color={resolvedTheme.primary} />
                <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-primary">
                  1. Surface Colors
                </Text>
              </View>
              <AppIcon
                icon={collapsedSections.surfaces ? ArrowDown01Icon : ArrowUp01Icon}
                size={16}
                color={resolvedTheme.textMuted}
              />
            </Pressable>

            {!collapsedSections.surfaces && (
              <View className="mt-3">
                <ColorField
                  label="Canvas Surface"
                  tokenKey="canvas"
                  value={resolvedTheme.canvas}
                  onChange={(v) => updateToken("canvas", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Canvas Surface",
                      tokenKey: "canvas",
                      initialColor: resolvedTheme.canvas,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Card Background"
                  tokenKey="card"
                  value={resolvedTheme.card}
                  onChange={(v) => updateToken("card", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Card Background",
                      tokenKey: "card",
                      initialColor: resolvedTheme.card,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Card Border"
                  tokenKey="cardBorder"
                  value={resolvedTheme.cardBorder}
                  onChange={(v) => updateToken("cardBorder", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Card Border",
                      tokenKey: "cardBorder",
                      initialColor: resolvedTheme.cardBorder,
                    })
                  }
                  theme={resolvedTheme}
                />
              </View>
            )}
          </View>

          {/* 2. Accents & Buttons */}
          <View className="rounded-card border border-border bg-card p-3">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => toggleSection("accents")}
            >
              <View className="flex-row items-center gap-2">
                <AppIcon icon={SparklesIcon} size={16} color={resolvedTheme.primary} />
                <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-primary">
                  2. Brand & Button Colors
                </Text>
              </View>
              <AppIcon
                icon={collapsedSections.accents ? ArrowDown01Icon : ArrowUp01Icon}
                size={16}
                color={resolvedTheme.textMuted}
              />
            </Pressable>

            {!collapsedSections.accents && (
              <View className="mt-3">
                <ColorField
                  label="Primary Accent (Button)"
                  tokenKey="primary"
                  value={resolvedTheme.primary}
                  onChange={(v) => updateToken("primary", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Primary Accent Color",
                      tokenKey: "primary",
                      initialColor: resolvedTheme.primary,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Primary Button Text"
                  tokenKey="primaryForeground"
                  value={resolvedTheme.primaryForeground}
                  onChange={(v) => updateToken("primaryForeground", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Primary Button Text",
                      tokenKey: "primaryForeground",
                      initialColor: resolvedTheme.primaryForeground,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Secondary Button Surface"
                  tokenKey="secondary"
                  value={resolvedTheme.secondary}
                  onChange={(v) => updateToken("secondary", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Secondary Button Surface",
                      tokenKey: "secondary",
                      initialColor: resolvedTheme.secondary,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Secondary Button Text"
                  tokenKey="secondaryForeground"
                  value={resolvedTheme.secondaryForeground}
                  onChange={(v) => updateToken("secondaryForeground", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Secondary Button Text",
                      tokenKey: "secondaryForeground",
                      initialColor: resolvedTheme.secondaryForeground,
                    })
                  }
                  theme={resolvedTheme}
                />
              </View>
            )}
          </View>

          {/* 3. Semantics */}
          <View className="rounded-card border border-border bg-card p-3">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={() => toggleSection("semantics")}
            >
              <View className="flex-row items-center gap-2">
                <AppIcon icon={ColorPickerIcon} size={16} color={resolvedTheme.success} />
                <Text className="font-ui-bold text-xs uppercase tracking-wider text-text-primary">
                  3. Semantic Status Colors
                </Text>
              </View>
              <AppIcon
                icon={collapsedSections.semantics ? ArrowDown01Icon : ArrowUp01Icon}
                size={16}
                color={resolvedTheme.textMuted}
              />
            </Pressable>

            {!collapsedSections.semantics && (
              <View className="mt-3">
                <ColorField
                  label="Success Color"
                  tokenKey="success"
                  value={resolvedTheme.success}
                  onChange={(v) => updateToken("success", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Success Color",
                      tokenKey: "success",
                      initialColor: resolvedTheme.success,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Warning Color"
                  tokenKey="warning"
                  value={resolvedTheme.warning}
                  onChange={(v) => updateToken("warning", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Warning Color",
                      tokenKey: "warning",
                      initialColor: resolvedTheme.warning,
                    })
                  }
                  theme={resolvedTheme}
                />
                <ColorField
                  label="Danger Color"
                  tokenKey="danger"
                  value={resolvedTheme.danger}
                  onChange={(v) => updateToken("danger", v)}
                  onOpenPicker={() =>
                    setPickerTarget({
                      title: "Pick Danger Color",
                      tokenKey: "danger",
                      initialColor: resolvedTheme.danger,
                    })
                  }
                  theme={resolvedTheme}
                />
              </View>
            )}
          </View>

          {/* E. Master Actions */}
          <View className="rounded-card border border-border bg-card p-3">
            <Text className="mb-2 font-ui-bold text-xs uppercase tracking-wider text-text-muted">
              Master Actions
            </Text>

            {scope === "character" ? (
              <View className="gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => promoteCharacterToGlobal(targetCharacterId)}
                >
                  Promote to Master Default Theme
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => resetCharacterTheme(targetCharacterId)}
                >
                  Reset to Default Theme
                </Button>
              </View>
            ) : (
              <Button variant="destructive" size="sm" onPress={resetGlobalTheme}>
                Reset to Factory Defaults
              </Button>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Reanimated Color Picker Modal */}
      <ColorPickerModal
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget?.title ?? ""}
        initialColor={pickerTarget?.initialColor ?? "#F59E0B"}
        onSelectColor={(hex) => {
          if (pickerTarget) {
            updateToken(pickerTarget.tokenKey, hex);
          }
        }}
      />
    </Modal>
  );
}
