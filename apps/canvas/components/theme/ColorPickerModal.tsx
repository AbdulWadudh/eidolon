import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import * as React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ColorPicker, { HueSlider, Panel1, Preview, Swatches } from "reanimated-color-picker";
import { AppIcon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";

export interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialColor: string;
  onSelectColor: (hex: string) => void;
}

const DEFAULT_SWATCHES = [
  "#F59E0B",
  "#06B6D4",
  "#F43F5E",
  "#10B981",
  "#8B5CF6",
  "#18191E",
  "#1E293B",
  "#0D0E11",
  "#242630",
  "#FFFFFF",
];

export function ColorPickerModal({
  isOpen,
  onClose,
  title,
  initialColor,
  onSelectColor,
}: ColorPickerModalProps) {
  const [selectedHex, setSelectedHex] = React.useState(initialColor || "#F59E0B");

  React.useEffect(() => {
    if (initialColor) {
      setSelectedHex(initialColor);
    }
  }, [initialColor]);

  const handleApply = () => {
    onSelectColor(selectedHex);
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center bg-black/75 p-4">
          <View className="w-full max-w-sm rounded-card border border-card-border bg-card p-5 shadow-2xl">
            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-ui-bold text-sm text-text-primary">{title}</Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-button border border-border bg-input active:bg-border"
                onPress={onClose}
              >
                <AppIcon icon={Cancel01Icon} size={16} color="#8E95A5" />
              </Pressable>
            </View>

            {/* Native Browser Color Picker on Web */}
            {Platform.OS === "web" && (
              <View className="mb-3 flex-row items-center justify-between rounded-button border border-border bg-input px-3 py-2">
                <Text className="font-ui-medium text-xs text-text-primary">
                  System Color Palette
                </Text>
                <input
                  type="color"
                  value={selectedHex.startsWith("#") ? selectedHex.slice(0, 7) : selectedHex}
                  onChange={(e) => setSelectedHex(e.target.value.toUpperCase())}
                  style={{
                    cursor: "pointer",
                    border: "1px solid #2A2C37",
                    width: 32,
                    height: 28,
                    borderRadius: 6,
                    padding: 0,
                    backgroundColor: "transparent",
                  }}
                />
              </View>
            )}

            {/* Reanimated Color Picker */}
            <ColorPicker
              value={selectedHex}
              style={{ width: "100%", gap: 14 }}
              onChangeJS={({ hex }) => {
                if (hex) setSelectedHex(hex.toUpperCase());
              }}
              onCompleteJS={({ hex }) => {
                if (hex) setSelectedHex(hex.toUpperCase());
              }}
            >
              <Preview style={{ height: 36, borderRadius: 8 }} />
              <Panel1 style={{ height: 180, borderRadius: 10 }} />
              <HueSlider style={{ height: 26, borderRadius: 8 }} />
              <Swatches colors={DEFAULT_SWATCHES} style={{ marginTop: 4 }} />
            </ColorPicker>

            {/* Footer Controls */}
            <View className="mt-5 flex-row gap-2.5">
              <Button variant="secondary" className="flex-1" onPress={onClose}>
                Cancel
              </Button>
              <Button variant="default" className="flex-1 gap-1.5" onPress={handleApply}>
                <AppIcon icon={CheckmarkCircle01Icon} size={16} color="#000000" />
                <Text className="font-ui-bold text-xs text-primary-foreground">Apply Color</Text>
              </Button>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
