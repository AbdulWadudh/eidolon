import { CONFIRM_COPY, DASHBOARD_COPY, THEME_COPY } from "@eidolon/config";
import type { AdminThemeView, ThemeTokenPatch } from "@eidolon/protocol";
import type { ThemeTokens } from "@eidolon/tokens";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { COLOUR_SECTIONS, FONT_TOKENS, NUMBER_TOKENS } from "@/components/admin/theme-sections";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ColorPickerModal } from "@/components/theme/ColorPickerModal";
import { ColorField } from "@/components/theme/color-field";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { FontFamilyPicker } from "@/components/ui/font-family-picker";
import { RangeSlider } from "@/components/ui/range-slider";
import { ResetTokenButton } from "@/components/ui/reset-token-button";
import { TextSizeControl } from "@/components/ui/text-size-control";
import { useConfirm } from "@/hooks/use-confirm";
import { MODES } from "@/lib/theme-presets";
import { fetchTheme, resetTheme, resetThemeToken, saveTheme } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function AdminThemeScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();
  const confirmation = useConfirm();

  const [view, setView] = React.useState<AdminThemeView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openSection, setOpenSection] = React.useState<string | null>(
    COLOUR_SECTIONS[0]?.key ?? null,
  );
  const [picker, setPicker] = React.useState<{
    token: keyof ThemeTokens;
    title: string;
    initial: string;
  } | null>(null);

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

  const patch = React.useCallback(
    (body: ThemeTokenPatch) => {
      setView((current) =>
        current === null ? current : { ...current, tokens: { ...current.tokens, ...body } },
      );
      setError(null);
      saveTheme(serverHost, pairingToken, body)
        .then(setView)
        .catch(() => setError(DASHBOARD_COPY.failed));
    },
    [pairingToken, serverHost],
  );

  const revert = React.useCallback(
    (token: keyof ThemeTokens) => {
      setError(null);
      resetThemeToken(serverHost, pairingToken, token)
        .then(setView)
        .catch(() => setError(DASHBOARD_COPY.failed));
    },
    [pairingToken, serverHost],
  );

  const revertAll = React.useCallback(() => {
    confirmation.ask({
      title: CONFIRM_COPY.resetTheme,
      body: CONFIRM_COPY.resetThemeBody,
      confirmLabel: CONFIRM_COPY.resetThemeAction,
      onConfirm: () => {
        setError(null);
        resetTheme(serverHost, pairingToken)
          .then(setView)
          .catch(() => setError(DASHBOARD_COPY.failed));
      },
    });
  }, [confirmation.ask, pairingToken, serverHost]);

  const isShipped = React.useCallback(
    (token: keyof ThemeTokens) => (view ? !(token in view.overrides) : true),
    [view],
  );

  const toggle = React.useCallback((key: string) => {
    setOpenSection((prev) => (prev === key ? null : key));
  }, []);

  const tokens = view?.tokens;
  const overridden = view ? Object.keys(view.overrides).length : 0;

  return (
    <AdminScreen
      title={DASHBOARD_COPY.themeTitle}
      blurb={DASHBOARD_COPY.themeBlurb}
      isLoading={isLoading || !tokens}
      error={error}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-ui text-xs text-text-muted">
          {DASHBOARD_COPY.overriddenCount(overridden)}
        </Text>
        {overridden > 0 ? (
          <Button variant="secondary" size="sm" onPress={revertAll}>
            {THEME_COPY.startOver}
          </Button>
        ) : null}
      </View>

      {tokens ? (
        <>
          <Animated.View entering={revealAt(0, reduced)}>
            <View className="flex-row items-center justify-between rounded-card border border-border bg-card px-3 py-2.5">
              <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-wider">
                {THEME_COPY.appliesTo}
              </Text>
              <View className="flex-row items-center gap-1 rounded-button border border-border bg-input p-0.5">
                {MODES.map(({ mode, label, icon }) => {
                  const active = tokens.mode === mode;
                  return (
                    <PressableScale
                      key={mode}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => patch({ mode })}
                      className={`flex-row items-center gap-1.5 rounded-button px-2.5 py-1.5 ${
                        active ? "bg-primary" : ""
                      }`}
                    >
                      <AppIcon
                        icon={icon}
                        size={14}
                        color={active ? theme.primaryForeground : theme.textMuted}
                      />
                      <Text
                        className={`font-ui-medium text-[11px] ${
                          active ? "text-primary-foreground" : "text-text-muted"
                        }`}
                      >
                        {label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {COLOUR_SECTIONS.map((section, index) => (
            <Animated.View entering={revealAt(index + 1, reduced)} key={section.key}>
              <CollapsibleSection
                sectionKey={section.key}
                title={section.title}
                expanded={openSection === section.key}
                onToggle={toggle}
                chevronColor={theme.textMuted}
                className="rounded-card border border-border bg-card p-3"
              >
                {section.colours.map((colour) => (
                  <ColorField
                    key={colour.token}
                    label={colour.label}
                    tokenKey={colour.token}
                    pickerTitle={colour.label}
                    value={String(tokens[colour.token])}
                    accentColor={theme.primary}
                    borderColor={theme.cardBorder}
                    mutedColor={theme.textMuted}
                    onChange={(token, value) => patch({ [token]: value })}
                    onOpenPicker={(token, title, current) =>
                      setPicker({ token, title, initial: current })
                    }
                    onReset={revert}
                    isDefault={isShipped(colour.token)}
                  />
                ))}
              </CollapsibleSection>
            </Animated.View>
          ))}

          <Animated.View entering={revealAt(COLOUR_SECTIONS.length + 1, reduced)}>
            <CollapsibleSection
              sectionKey="shape"
              title={THEME_COPY.corners}
              expanded={openSection === "shape"}
              onToggle={toggle}
              chevronColor={theme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="gap-4">
                {NUMBER_TOKENS.map((spec) => (
                  <View key={spec.token}>
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="font-ui-bold text-[11px] text-text-muted uppercase tracking-wider">
                        {spec.label}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-ui-bold text-primary text-xs">
                          {String(tokens[spec.token])}
                        </Text>
                        <ResetTokenButton
                          onPress={() => revert(spec.token)}
                          isDefault={isShipped(spec.token)}
                          color={theme.textMuted}
                          accessibilityLabel={`${DASHBOARD_COPY.reset}: ${spec.label}`}
                          size={26}
                        />
                      </View>
                    </View>
                    <RangeSlider
                      value={Number(tokens[spec.token])}
                      min={spec.min}
                      max={spec.max}
                      step={spec.step}
                      accentColor={theme.primary}
                      onChange={(value) => patch({ [spec.token]: value })}
                    />
                  </View>
                ))}
              </View>
            </CollapsibleSection>
          </Animated.View>

          <Animated.View entering={revealAt(COLOUR_SECTIONS.length + 2, reduced)}>
            <CollapsibleSection
              sectionKey="type"
              title={THEME_COPY.type}
              expanded={openSection === "type"}
              onToggle={toggle}
              chevronColor={theme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="gap-4">
                <TextSizeControl
                  value={tokens.fontScale}
                  onChange={(fontScale) => patch({ fontScale })}
                  onReset={() => revert("fontScale")}
                  isDefault={isShipped("fontScale")}
                  accentColor={theme.primary}
                  mutedColor={theme.textMuted}
                />
                {FONT_TOKENS.map((font) => (
                  <FontFamilyPicker
                    key={font.token}
                    label={font.label}
                    value={String(tokens[font.token])}
                    onSelect={(family) => patch({ [font.token]: family })}
                    onReset={() => revert(font.token)}
                    isDefault={isShipped(font.token)}
                    accentColor={theme.primary}
                    mutedColor={theme.textMuted}
                  />
                ))}
              </View>
            </CollapsibleSection>
          </Animated.View>
        </>
      ) : null}

      {confirmation.sheet}

      <ColorPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        title={picker?.title ?? ""}
        initialColor={picker?.initial ?? theme.primary}
        onSelectColor={(hex) => {
          if (picker) patch({ [picker.token]: hex });
        }}
      />
    </AdminScreen>
  );
}
