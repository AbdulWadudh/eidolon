import * as React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ColorPicker, {
  type ColorPickerRef,
  HueSlider,
  Panel1,
  Preview,
  Swatches,
} from "reanimated-color-picker";
import { AppIcon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@/lib/icons";

export interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Must stay stable while the sheet is open (see note below). */
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

/**
 * Stays mounted and is shown via `visible`, because on Android creating a nested
 * Dialog plus a GestureHandlerRootView and the Reanimated picker on demand costs
 * a visible freeze every single time the colour wheel is opened.
 *
 * Two things make that safe:
 *
 * 1. The picker is reset imperatively through `setColor` when it opens, so it
 *    always starts on the token being edited rather than the previous one.
 * 2. The live colour is tracked in a ref and never fed back through `value`.
 *    `ColorPicker` re-runs `setColor` with a 200ms `withTiming` whenever `value`
 *    changes, so echoing the gesture result back made the thumb animate away
 *    from the finger and re-rendered the modal on every frame.
 */
export function ColorPickerModal({
  isOpen,
  onClose,
  title,
  initialColor,
  onSelectColor,
}: ColorPickerModalProps) {
  const liveHex = React.useRef(initialColor);
  const pickerRef = React.useRef<ColorPickerRef>(null);

  // Only drives the web <input type="color"> swatch; native never sets it.
  const [webHex, setWebHex] = React.useState(initialColor);

  React.useEffect(() => {
    if (!isOpen) return;
    liveHex.current = initialColor;
    if (Platform.OS === "web") setWebHex(initialColor);
    // duration 0, so opening does not animate in from the previous token colour
    pickerRef.current?.setColor(initialColor, 0);
  }, [isOpen, initialColor]);

  const handleChange = React.useCallback(({ hex }: { hex: string }) => {
    if (!hex) return;
    liveHex.current = hex.toUpperCase();
    if (Platform.OS === "web") setWebHex(liveHex.current);
  }, []);

  const handleWebInput = React.useCallback((next: string) => {
    const hex = next.toUpperCase();
    liveHex.current = hex;
    setWebHex(hex);
    pickerRef.current?.setColor(hex);
  }, []);

  const handleApply = () => {
    onSelectColor(liveHex.current);
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
                  value={webHex.startsWith("#") ? webHex.slice(0, 7) : webHex}
                  onChange={(e) => handleWebInput(e.target.value)}
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
              ref={pickerRef}
              value={initialColor}
              style={{ width: "100%", gap: 14 }}
              onChangeJS={handleChange}
              onCompleteJS={handleChange}
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
