import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { EditableRow, type SaveState } from "@/components/admin/EditableRow";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";
import type { ConfigSetting } from "@/store/admin-api";

function render(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "on" : "off";
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

function leafOf(path: string): string {
  return path.includes(".") ? path.slice(path.indexOf(".") + 1) : path;
}

export function ReadOnlyConfigRow({ setting }: { setting: ConfigSetting }) {
  return (
    <GlassSurface
      tint="card"
      className="overflow-hidden rounded-card border border-border px-4 py-3"
      style={{ opacity: 0.62 }}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="font-ui-medium text-sm text-text-muted">{leafOf(setting.path)}</Text>
          <Text className="mt-0.5 font-ui text-[11px] text-text-muted leading-4">
            {setting.reason}
          </Text>
          {setting.boundTo ? (
            <Text className="mt-1 font-ui-medium text-[10px] text-primary">{setting.boundTo}</Text>
          ) : null}
        </View>

        <Text
          className="max-w-[40%] text-right font-ui text-[11px] text-text-muted"
          numberOfLines={3}
        >
          {setting.secret && setting.value === false ? "not set" : render(setting.value)}
        </Text>
      </View>
    </GlassSurface>
  );
}

export interface EditableConfigRowProps {
  setting: ConfigSetting;
  expanded: boolean;
  saveState: SaveState;
  onToggle: () => void;
  onSave: (value: unknown) => void;
  onReset: () => void;
}

export function EditableConfigRow({
  setting,
  expanded,
  saveState,
  onToggle,
  onSave,
  onReset,
}: EditableConfigRowProps) {
  const [draft, setDraft] = React.useState(() => render(setting.value));

  React.useEffect(() => {
    if (expanded) setDraft(render(setting.value));
  }, [expanded, setting.value]);

  if (setting.kind === "boolean") {
    return (
      <GlassSurface
        tint="card"
        className="overflow-hidden rounded-card border border-border px-4 py-2"
      >
        <SwitchRow
          label={leafOf(setting.path)}
          hint={`${DASHBOARD_COPY.shipped}: ${render(setting.shipped)}`}
          value={setting.value === true}
          onValueChange={(next) => onSave(next)}
          accessibilityLabel={setting.path}
        />
      </GlassSurface>
    );
  }

  const parsed = (): unknown => {
    if (setting.kind === "number") return Number(draft);
    if (setting.kind === "list" || setting.kind === "object") {
      try {
        return JSON.parse(draft) as unknown;
      } catch {
        return undefined;
      }
    }
    return draft;
  };

  const candidate = parsed();
  const valid =
    candidate !== undefined &&
    (setting.kind !== "number" || Number.isFinite(candidate as number)) &&
    draft !== render(setting.value);

  return (
    <EditableRow
      title={leafOf(setting.path)}
      subtitle={`${DASHBOARD_COPY.shipped}: ${render(setting.shipped)}`}
      badge={setting.isOverridden ? DASHBOARD_COPY.custom : null}
      expanded={expanded}
      onToggle={onToggle}
      onSave={() => onSave(candidate)}
      onReset={setting.isOverridden ? onReset : undefined}
      saveState={saveState}
      canSave={valid}
    >
      <Input
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={setting.kind === "list" || setting.kind === "object"}
        keyboardType={setting.kind === "number" ? "numeric" : "default"}
      />
      <Text className="font-ui text-[10px] text-text-muted">{setting.reason}</Text>
    </EditableRow>
  );
}
