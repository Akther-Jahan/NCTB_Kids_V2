import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { VisualField } from "./payloadFormSchema";

export const valueText = (value: unknown) =>
  typeof value === "string" ? value : "";

export const valueNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;

export const valueBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export function PayloadField({
  field,
  value,
  onChange,
}: {
  field: VisualField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "boolean") {
    const active = valueBoolean(value);
    return (
      <View style={styles.toggleRow}>
        <Text style={styles.label}>{field.label}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: active }}
          onPress={() => onChange(!active)}
          style={[styles.toggle, active && styles.toggleActive]}
        >
          <View style={[styles.dot, active && styles.dotActive]} />
        </Pressable>
      </View>
    );
  }

  if (field.kind === "choice") {
    return (
      <View>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.choiceRow}>
          {(field.choices ?? []).map((choice) => {
            const active = valueText(value) === choice.value;
            return (
              <Pressable
                key={choice.value}
                onPress={() => onChange(choice.value)}
                style={[styles.choice, active && styles.choiceActive]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    active && styles.choiceTextActive,
                  ]}
                >
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const numeric = field.kind === "number";

  return (
    <View>
      <Text style={styles.label}>{field.label}</Text>
      <TextInput
        value={numeric ? String(valueNumber(value)) : valueText(value)}
        placeholder={field.placeholder}
        placeholderTextColor="#98A4AC"
        keyboardType={numeric ? "number-pad" : "default"}
        multiline={field.multiline}
        textAlignVertical={field.multiline ? "top" : "center"}
        onChangeText={(next) =>
          onChange(
            numeric
              ? Number(next.replace(/[^0-9]/g, "")) || 0
              : next,
          )
        }
        style={[styles.input, field.multiline && styles.area]}
      />
    </View>
  );
}

export function PayloadChoice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive]}
    >
      <Text
        style={[
          styles.choiceText,
          active && styles.choiceTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: "900",
    color: "#4B5F6D",
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE4E9",
    color: "#263F50",
    fontSize: 12,
    fontWeight: "700",
  },
  area: { minHeight: 82 },
  toggleRow: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6EA",
  },
  toggle: {
    width: 46,
    height: 26,
    padding: 3,
    borderRadius: 13,
    backgroundColor: "#CDD5DA",
  },
  toggleActive: { backgroundColor: "#4A7EA3" },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  dotActive: { alignSelf: "flex-end" },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  choice: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEF2",
  },
  choiceActive: { backgroundColor: "#315F85" },
  choiceText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#667984",
  },
  choiceTextActive: { color: "#FFFFFF" },
});
