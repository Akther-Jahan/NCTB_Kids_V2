import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PayloadField, valueText } from "./PayloadControls";
import type {
  VisualField,
  VisualList,
} from "./payloadFormSchema";

export type PayloadItem = Record<string, unknown>;

export const objectList = (value: unknown): PayloadItem[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is PayloadItem =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      )
    : [];

export const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export function ObjectPayloadList({
  config,
  items,
  onChange,
}: {
  config: VisualList;
  items: PayloadItem[];
  onChange: (items: PayloadItem[]) => void;
}) {
  const addItem = () =>
    onChange([
      ...items,
      {
        id: `${config.key}-${Date.now()}-${items.length + 1}`,
      },
    ]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{config.title}</Text>
        <Pressable onPress={addItem} style={styles.addButton}>
          <Text style={styles.addText}>＋ {config.addLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.gap}>
        {items.map((item, index) => (
          <View key={valueText(item.id) || `${config.key}-${index}`} style={styles.card}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>
                {config.itemLabel} {index + 1}
              </Text>
              <Pressable
                onPress={() =>
                  onChange(
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>

            <View style={styles.gap}>
              {config.fields.map((field: VisualField) => (
                <PayloadField
                  key={field.key}
                  field={field}
                  value={item[field.key]}
                  onChange={(value) =>
                    onChange(
                      items.map((current, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...current,
                              [field.key]: value,
                            }
                          : current,
                      ),
                    )
                  }
                />
              ))}
            </View>
          </View>
        ))}

        {items.length === 0 ? (
          <Text style={styles.empty}>No items yet. Tap Add.</Text>
        ) : null}
      </View>
    </View>
  );
}

export function StringPayloadList({
  title,
  values,
  placeholder,
  onChange,
}: {
  title: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={() => onChange([...values, ""])}
          style={styles.addButton}
        >
          <Text style={styles.addText}>＋ Add</Text>
        </Pressable>
      </View>

      <View style={styles.gap}>
        {values.map((value, index) => (
          <View key={`${title}-${index}`} style={styles.inlineRow}>
            <TextInput
              value={value}
              onChangeText={(next) =>
                onChange(
                  values.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                )
              }
              placeholder={placeholder}
              placeholderTextColor="#99A4AC"
              style={[styles.input, styles.flex]}
            />
            <Pressable
              onPress={() =>
                onChange(
                  values.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              style={styles.removeSquare}
            >
              <Text style={styles.removeSquareText}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: "900",
    color: "#40596A",
  },
  addButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4EFF6",
  },
  addText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#315F85",
  },
  gap: { gap: 9 },
  card: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E7EB",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#3A5365",
  },
  removeButton: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 10,
    justifyContent: "center",
    backgroundColor: "#FCE8E5",
  },
  removeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#9E4F43",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE4E9",
    color: "#263F50",
    fontSize: 12,
    fontWeight: "700",
  },
  removeSquare: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE8E5",
  },
  removeSquareText: {
    fontSize: 22,
    color: "#A24F43",
  },
  empty: {
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    color: "#96A2AA",
  },
});
