import { MIND_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { AlertSheet } from "@/components/ui/alert-sheet";
import { Cancel01Icon, CheckmarkCircle01Icon, Delete02Icon, PencilEdit02Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface RowActionsProps {
  characterId: string;
  isEditing: boolean;
  canSave?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function RowActions({
  characterId,
  isEditing,
  canSave = true,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: RowActionsProps) {
  const theme = useResolvedTheme(characterId);
  const [asking, setAsking] = React.useState(false);

  if (isEditing) {
    return (
      <View className="flex-row items-center gap-1">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={MIND_COPY.cancel}
          accessibilityState={{ disabled: false }}
          hitSlop={10}
          onPress={onCancel}
          className="h-8 w-8 items-center justify-center rounded-button"
        >
          <AppIcon icon={Cancel01Icon} size={15} color={theme.textMuted} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={MIND_COPY.save}
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          hitSlop={10}
          onPress={onSave}
          className="h-8 w-8 items-center justify-center rounded-button"
          style={{ opacity: canSave ? 1 : 0.35 }}
        >
          <AppIcon icon={CheckmarkCircle01Icon} size={16} color={theme.primary} strokeWidth={2} />
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={MIND_COPY.edit}
        hitSlop={10}
        onPress={onEdit}
        className="h-8 w-8 items-center justify-center rounded-button"
      >
        <AppIcon icon={PencilEdit02Icon} size={15} color={theme.textMuted} />
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={MIND_COPY.remove}
        hitSlop={10}
        onPress={() => setAsking(true)}
        className="h-8 w-8 items-center justify-center rounded-button"
      >
        <AppIcon icon={Delete02Icon} size={15} color={theme.danger} />
      </PressableScale>

      <AlertSheet
        isOpen={asking}
        characterId={characterId}
        title={MIND_COPY.deleteConfirm}
        confirmLabel={MIND_COPY.remove}
        isDestructive
        onConfirm={onDelete}
        onClose={() => setAsking(false)}
      />
    </View>
  );
}

export function AddRowButton({
  characterId,
  label,
  onPress,
}: {
  characterId: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useResolvedTheme(characterId);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 items-center justify-center rounded-card border border-border border-dashed"
    >
      <Text className="font-ui-medium text-xs" style={{ color: theme.primary }}>
        {label}
      </Text>
    </PressableScale>
  );
}
