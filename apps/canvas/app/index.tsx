import { COLORS, GEOMETRY, TYPOGRAPHY } from "@eidolon/tokens";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Eidolon Canvas</Text>
        <Text style={styles.subtitle}>Connected to Conductor</Text>
        <View style={styles.badge}>
          <View style={styles.statusDot} />
          <Text style={styles.badgeText}>Stage 1 Runtime Active</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: GEOMETRY.cardRadius,
    borderWidth: GEOMETRY.hairlineBorderWidth,
    borderColor: COLORS.cardBorder,
    padding: 24,
    alignItems: "center",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.dialogue,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.accentAmber,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.audioPillBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GEOMETRY.buttonRadius,
    borderWidth: GEOMETRY.hairlineBorderWidth,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  badgeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
});
