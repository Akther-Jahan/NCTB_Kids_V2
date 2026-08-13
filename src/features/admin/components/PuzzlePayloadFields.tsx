import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ObjectPayloadList,
  StringPayloadList,
  objectList,
  stringList,
} from "./PayloadListEditors";
import {
  PayloadChoice,
  PayloadField,
  valueNumber,
  valueText,
} from "./PayloadControls";

type Payload = Record<string, unknown>;

type Props = {
  payload: Payload;
  onChange: (patch: Payload) => void;
};

const textField = (
  key: string,
  label: string,
  placeholder?: string,
  multiline = false,
) => ({
  key,
  label,
  placeholder,
  multiline,
});

export default function PuzzlePayloadFields({
  payload,
  onChange,
}: Props) {
  const mode = valueText(payload.mode) || "missing_letter";

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>NO-CODE PUZZLE BUILDER</Text>
      <Text style={styles.title}>Choose a puzzle type</Text>

      <View style={styles.choices}>
        {[
          ["missing_letter", "Missing Letter"],
          ["word_order", "Word Order"],
          ["category_sort", "Category Sort"],
          ["image_jigsaw", "Image Jigsaw"],
        ].map(([value, label]) => (
          <PayloadChoice
            key={value}
            label={label}
            active={mode === value}
            onPress={() => onChange({ mode: value })}
          />
        ))}
      </View>

      <View style={styles.gap}>
        <PayloadField
          field={textField("prompt", "Instruction / prompt", "Complete the puzzle", true)}
          value={payload.prompt}
          onChange={(prompt) => onChange({ prompt })}
        />
        <PayloadField
          field={textField("voice_text", "Mimi voice text (optional)", "What Mimi should say", true)}
          value={payload.voice_text}
          onChange={(voice_text) => onChange({ voice_text })}
        />
        <PayloadField
          field={textField("hint", "Hint (optional)", "A helpful hint", true)}
          value={payload.hint}
          onChange={(hint) => onChange({ hint })}
        />

        {mode === "missing_letter" ? (
          <>
            <PayloadField
              field={textField("pattern", "Pattern", "আ_")}
              value={payload.pattern}
              onChange={(pattern) => onChange({ pattern })}
            />
            <PayloadField
              field={textField("correct_answer", "Correct answer", "ম")}
              value={payload.correct_answer}
              onChange={(correct_answer) => onChange({ correct_answer })}
            />
            <StringPayloadList
              title="Answer options"
              values={stringList(payload.options)}
              placeholder="ম"
              onChange={(options) => onChange({ options })}
            />
          </>
        ) : null}

        {mode === "word_order" ? (
          <>
            <StringPayloadList
              title="Word tiles"
              values={stringList(payload.words)}
              placeholder="আমি"
              onChange={(words) => onChange({ words })}
            />
            <StringPayloadList
              title="Correct order"
              values={stringList(payload.correct_order)}
              placeholder="আমি"
              onChange={(correct_order) => onChange({ correct_order })}
            />
          </>
        ) : null}

        {mode === "category_sort" ? (
          <>
            <ObjectPayloadList
              config={{
                key: "categories",
                title: "Categories",
                addLabel: "Add category",
                itemLabel: "Category",
                fields: [
                  {
                    key: "label_bn",
                    label: "Category name",
                    placeholder: "ফল",
                  },
                ],
              }}
              items={objectList(payload.categories)}
              onChange={(categories) => onChange({ categories })}
            />
            <ObjectPayloadList
              config={{
                key: "items",
                title: "Items to sort",
                addLabel: "Add item",
                itemLabel: "Item",
                fields: [
                  { key: "label_bn", label: "Item name", placeholder: "আম" },
                  { key: "emoji", label: "Emoji", placeholder: "🥭" },
                  {
                    key: "target",
                    label: "Correct category name",
                    placeholder: "ফল",
                  },
                ],
              }}
              items={objectList(payload.items)}
              onChange={(items) => onChange({ items })}
            />
          </>
        ) : null}

        {mode === "image_jigsaw" ? (
          <>
            <PayloadField
              field={textField("image_url", "Puzzle image link", "https://...")}
              value={payload.image_url}
              onChange={(image_url) => onChange({ image_url })}
            />
            <View>
              <Text style={styles.label}>Pieces</Text>
              <View style={styles.choices}>
                {[4, 6, 9].map((count) => (
                  <PayloadChoice
                    key={count}
                    label={`${count} pieces`}
                    active={valueNumber(payload.piece_count, 4) === count}
                    onPress={() => onChange({ piece_count: count })}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#F7F9FB",
    borderWidth: 1,
    borderColor: "#E1E7EC",
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: "900",
    color: "#6F8494",
  },
  title: {
    marginTop: 3,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#274459",
  },
  gap: { gap: 12, marginTop: 12 },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  label: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: "900",
    color: "#4B5F6D",
  },
});
