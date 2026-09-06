import { THEME_COPY } from "@eidolon/config";
import type { ThemeTokens } from "@eidolon/tokens";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { VariableContextProvider } from "react-native-css";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { ColorPickerModal } from "@/components/theme/ColorPickerModal";
import { ColorField } from "@/components/theme/color-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { FontFamilyPicker } from "@/components/ui/font-family-picker";
import { RangeSlider } from "@/components/ui/range-slider";
import { ResetTokenButton } from "@/components/ui/reset-token-button";
import { TextSizeControl } from "@/components/ui/text-size-control";
import { Cancel01Icon, ColorPickerIcon, PaintBoardIcon, SparklesIcon } from "@/lib/icons";
import { MODES } from "@/lib/theme-presets";
import {
  defaultTokenValue,
  useResolvedTheme,
  useThemeCssVars,
  useThemeStore,
} from "@/store/theme-store";

export interface ThemeStudioSheetProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
  characterName?: string;
}

const RADIUS_PRESETS = [0, 8, 10, 14, 22];

const INSPECTED_TOKENS: [string, keyof ThemeTokens][] = [
  ["--canvas", "canvas"],
  ["--card", "card"],
  ["--card-border", "cardBorder"],
  ["--primary", "primary"],
  ["--primary-foreground", "primaryForeground"],
  ["--secondary", "secondary"],
  ["--text-primary", "textPrimary"],
  ["--text-muted", "textMuted"],
  ["--success", "success"],
  ["--warning", "warning"],
  ["--danger", "danger"],
  ["--radius", "radius"],
  ["--font-main", "fontMain"],
  ["--font-ui", "fontUI"],
  ["--font-scale", "fontScale"],
];

export function ThemeStudioSheet({
  isOpen,
  onClose,
  characterId = "emma",
  characterName = "Emma",
}: ThemeStudioSheetProps) {
  const updateGlobalToken = useThemeStore((state) => state.updateGlobalToken);
  const updateCharacterToken = useThemeStore((state) => state.updateCharacterToken);
  const resetCharacterTheme = useThemeStore((state) => state.resetCharacterTheme);
  const promoteCharacterToGlobal = useThemeStore((state) => state.promoteCharacterToGlobal);
  const resetGlobalTheme = useThemeStore((state) => state.resetGlobalTheme);
  const setColorMode = useThemeStore((state) => state.setColorMode);

  const [scope, setScope] = React.useState<"global" | "character">("global");
  // Accordion, collapsed by default, so the live preview stays on screen while
  // editing instead of being pushed off by the full control list.
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
  const toggleSection = React.useCallback((key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);

  // The target is deliberately kept after closing, so `initialColor` never flips
  // to a fallback while the modal is still on screen.
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerTarget, setPickerTarget] = React.useState<{
    title: string;
    tokenKey: keyof ThemeTokens;
    initialColor: string;
  } | null>(null);

  const targetCharacterId = characterId || "emma";
  const scopedCharacterId = scope === "character" ? targetCharacterId : undefined;
  const resolvedTheme = useResolvedTheme(scopedCharacterId);
  const previewCssVars = useThemeCssVars(scopedCharacterId);

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

  const characterOverrides = useThemeStore(
    (state) => state.characterThemes[targetCharacterId]?.[state.palettes.mode],
  );
  const characterOverrideKeys = React.useMemo(
    () => Object.keys(characterOverrides ?? {}) as (keyof ThemeTokens)[],
    [characterOverrides],
  );
  const characterHasOverrides = characterOverrideKeys.length > 0;

  const sheetStyle = React.useMemo(
    () => ({ flex: 1, backgroundColor: resolvedTheme.canvas }),
    [resolvedTheme.canvas],
  );

  // Mode selects which palette is read, so it is global rather than per-scope.
  const handleSetColorMode = (mode: "dark" | "light") => {
    setColorMode(mode);
  };

  const updateToken = React.useCallback(
    <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => {
      if (scope === "global") {
        updateGlobalToken(key, value);
      } else {
        updateCharacterToken(targetCharacterId, key, value);
      }
    },
    [scope, targetCharacterId, updateGlobalToken, updateCharacterToken],
  );

  // Stable identities, so the memoised ColorFields are not invalidated every render.
  const handleColorChange = React.useCallback(
    (tokenKey: keyof ThemeTokens, val: string) => {
      updateToken(tokenKey, val as ThemeTokens[typeof tokenKey]);
    },
    [updateToken],
  );

  const resetToken = useThemeStore((state) => state.resetToken);

  const handleResetToken = React.useCallback(
    (tokenKey: keyof ThemeTokens) => {
      resetToken(tokenKey, scopedCharacterId);
    },
    [resetToken, scopedCharacterId],
  );

  // In character scope a token is "default" when it has no override at all.
  const isTokenDefault = React.useCallback(
    (tokenKey: keyof ThemeTokens) =>
      scope === "character"
        ? !characterOverrideKeys.includes(tokenKey)
        : resolvedTheme[tokenKey] === defaultTokenValue(tokenKey, resolvedTheme.mode),
    [scope, characterOverrideKeys, resolvedTheme],
  );

  const handleOpenPicker = React.useCallback(
    (tokenKey: keyof ThemeTokens, title: string, current: string) => {
      setPickerTarget({ tokenKey, title, initialColor: current });
      setPickerOpen(true);
    },
    [],
  );

  const handleRadiusChange = (text: string) => {
    const parsed = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 60) {
      updateToken("radius", parsed);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <VariableContextProvider value={previewCssVars}>
        <SafeAreaView style={sheetStyle} className="flex-1 bg-canvas">
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
            <CollapsibleSection
              sectionKey="scope"
              title={THEME_COPY.appliesTo}
              badge={
                <Text className="font-ui-bold text-[11px] text-text-primary">
                  {scope === "global" ? THEME_COPY.everyone : characterName}
                </Text>
              }
              expanded={expandedSection === "scope"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
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
                      scope === "character"
                        ? "text-primary-foreground font-bold"
                        : "text-text-muted"
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
                    {characterHasOverrides ? THEME_COPY.ownLook : THEME_COPY.sameAsEveryone}
                  </Badge>
                </View>
              )}
            </CollapsibleSection>

            {/* B. Color Appearance Mode (Dark / Light) */}
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
                      onPress={() => handleSetColorMode(mode)}
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

            {/* D. Live Interactive Preview Card */}
            <View key={previewKey}>
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
                        {scope === "character" ? characterName : THEME_COPY.everyone}
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
              title={THEME_COPY.corners}
              badge={
                <Text className="font-ui-bold text-xs text-primary">{resolvedTheme.radius}px</Text>
              }
              expanded={expandedSection === "radius"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
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
                    style={{
                      textAlign: "center",
                      paddingVertical: 0,
                      includeFontPadding: false,
                      textAlignVertical: "center",
                    }}
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
            </CollapsibleSection>

            {/* C. Color Variables Controls */}
            {/* 1. Surfaces */}
            <CollapsibleSection
              sectionKey="surfaces"
              icon={ColorPickerIcon}
              iconColor={resolvedTheme.primary}
              title="1. Surface Colors"
              expanded={expandedSection === "surfaces"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="mt-3">
                <ColorField
                  label={THEME_COPY.background}
                  tokenKey="canvas"
                  pickerTitle={THEME_COPY.background}
                  value={resolvedTheme.canvas}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("canvas")}
                />
                <ColorField
                  label={THEME_COPY.cards}
                  tokenKey="card"
                  pickerTitle={THEME_COPY.cards}
                  value={resolvedTheme.card}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("card")}
                />
                <ColorField
                  label={THEME_COPY.cardEdges}
                  tokenKey="cardBorder"
                  pickerTitle={THEME_COPY.cardEdges}
                  value={resolvedTheme.cardBorder}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("cardBorder")}
                />
              </View>
            </CollapsibleSection>

            {/* 2. Accents & Buttons */}
            <CollapsibleSection
              sectionKey="accents"
              icon={SparklesIcon}
              iconColor={resolvedTheme.primary}
              title="2. Brand & Button Colors"
              expanded={expandedSection === "accents"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="mt-3">
                <ColorField
                  label={THEME_COPY.accent}
                  tokenKey="primary"
                  pickerTitle={THEME_COPY.accent}
                  value={resolvedTheme.primary}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("primary")}
                />
                <ColorField
                  label={THEME_COPY.textOnAccent}
                  tokenKey="primaryForeground"
                  pickerTitle={THEME_COPY.textOnAccent}
                  value={resolvedTheme.primaryForeground}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("primaryForeground")}
                />
                <ColorField
                  label={THEME_COPY.quietButtons}
                  tokenKey="secondary"
                  pickerTitle={THEME_COPY.quietButtons}
                  value={resolvedTheme.secondary}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("secondary")}
                />
                <ColorField
                  label={THEME_COPY.textOnQuietButtons}
                  tokenKey="secondaryForeground"
                  pickerTitle={THEME_COPY.textOnQuietButtons}
                  value={resolvedTheme.secondaryForeground}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("secondaryForeground")}
                />
              </View>
            </CollapsibleSection>

            {/* 3. Semantics */}
            <CollapsibleSection
              sectionKey="semantics"
              icon={ColorPickerIcon}
              iconColor={resolvedTheme.success}
              title="3. Semantic Status Colors"
              expanded={expandedSection === "semantics"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="mt-3">
                <ColorField
                  label={THEME_COPY.success}
                  tokenKey="success"
                  pickerTitle={THEME_COPY.success}
                  value={resolvedTheme.success}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("success")}
                />
                <ColorField
                  label={THEME_COPY.caution}
                  tokenKey="warning"
                  pickerTitle={THEME_COPY.caution}
                  value={resolvedTheme.warning}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("warning")}
                />
                <ColorField
                  label={THEME_COPY.danger}
                  tokenKey="danger"
                  pickerTitle={THEME_COPY.danger}
                  value={resolvedTheme.danger}
                  accentColor={resolvedTheme.primary}
                  borderColor={resolvedTheme.cardBorder}
                  mutedColor={resolvedTheme.textMuted}
                  onChange={handleColorChange}
                  onOpenPicker={handleOpenPicker}
                  onReset={handleResetToken}
                  isDefault={isTokenDefault("danger")}
                />
              </View>
            </CollapsibleSection>

            <CollapsibleSection
              sectionKey="font"
              title={THEME_COPY.type}
              expanded={expandedSection === "font"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="gap-4">
                <TextSizeControl
                  value={resolvedTheme.fontScale}
                  onChange={(scale) => updateToken("fontScale", scale)}
                  onReset={() => handleResetToken("fontScale")}
                  isDefault={isTokenDefault("fontScale")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
                <FontFamilyPicker
                  label={THEME_COPY.dialogue}
                  value={resolvedTheme.fontMain}
                  onSelect={(family) => updateToken("fontMain", family)}
                  onReset={() => handleResetToken("fontMain")}
                  isDefault={isTokenDefault("fontMain")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
                <FontFamilyPicker
                  label={THEME_COPY.interface}
                  value={resolvedTheme.fontUI}
                  onSelect={(family) => updateToken("fontUI", family)}
                  onReset={() => handleResetToken("fontUI")}
                  isDefault={isTokenDefault("fontUI")}
                  accentColor={resolvedTheme.primary}
                  mutedColor={resolvedTheme.textMuted}
                />
              </View>
            </CollapsibleSection>

            <CollapsibleSection
              sectionKey="inspector"
              title={THEME_COPY.whatIsSet}
              expanded={expandedSection === "inspector"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="gap-1 rounded-card bg-input p-3">
                {INSPECTED_TOKENS.map(([cssVar, tokenKey]) => (
                  <View key={cssVar} className="flex-row items-center justify-between">
                    <Text className="font-ui text-[11px] text-text-muted">{cssVar}</Text>
                    <View className="flex-row items-center gap-1.5">
                      {typeof resolvedTheme[tokenKey] === "string" &&
                      String(resolvedTheme[tokenKey]).startsWith("#") ? (
                        <View
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: String(resolvedTheme[tokenKey]) }}
                        />
                      ) : null}
                      <Text className="font-ui-bold text-[11px] text-text-primary">
                        {String(resolvedTheme[tokenKey])}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </CollapsibleSection>

            {/* E. Master Actions */}
            <CollapsibleSection
              sectionKey="actions"
              title={THEME_COPY.startOver}
              expanded={expandedSection === "actions"}
              onToggle={toggleSection}
              chevronColor={resolvedTheme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
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
            </CollapsibleSection>
          </ScrollView>
        </SafeAreaView>
      </VariableContextProvider>

      <ColorPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerTarget?.title ?? ""}
        initialColor={pickerTarget?.initialColor ?? "#F59E0B"}
        onSelectColor={(hex) => {
          if (pickerTarget) {
            updateToken(pickerTarget.tokenKey, hex as never);
          }
        }}
      />
    </Modal>
  );
}
