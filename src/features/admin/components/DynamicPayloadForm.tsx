import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { SupabaseActivityType } from "../../learning/types/supabaseCurriculum";
import PuzzlePayloadFields from "./PuzzlePayloadFields";
import { PayloadChoice, PayloadField, valueNumber, valueText } from "./PayloadControls";
import {
  ObjectPayloadList,
  StringPayloadList,
  objectList,
  stringList,
} from "./PayloadListEditors";
import { payloadSchemas } from "./payloadFormSchema";

type Payload = Record<string, unknown>;

type Props = {
  activityType: SupabaseActivityType;
  payloadText: string;
  onChangePayloadText: (value: string) => void;
};

function parsePayload(value: string): Payload {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Payload;
    }
  } catch {
    // Legacy malformed JSON is replaced by a safe visual form state.
  }

  return { schema_version: 1, reward_xp: 10 };
}

export default function DynamicPayloadForm({
  activityType,
  payloadText,
  onChangePayloadText,
}: Props) {
  const payload = useMemo(() => parsePayload(payloadText), [payloadText]);
  const schema = payloadSchemas[activityType];

  const emit = (patch: Payload) => {
    onChangePayloadText(
      JSON.stringify(
        {
          ...payload,
          schema_version: valueNumber(payload.schema_version, 1) || 1,
          reward_xp: valueNumber(payload.reward_xp, 10),
          ...patch,
        },
        null,
        2,
      ),
    );
  };

  if (activityType === "puzzle") {
    return <PuzzlePayloadFields payload={payload} onChange={emit} />;
  }

  const pictureOptions = objectList(payload.options);
  const pictureAnswer = valueNumber(payload.answer, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>NO-CODE CONTENT BUILDER</Text>
      <Text style={styles.title}>Fill in the content fields</Text>
      <Text style={styles.help}>
        No JSON or coding is required. The app creates the payload automatically.
      </Text>

      <View style={styles.gap}>
        {(schema?.fields ?? []).map((field) => (
          <PayloadField
            key={field.key}
            field={field}
            value={payload[field.key]}
            onChange={(value) => emit({ [field.key]: value })}
          />
        ))}

        {activityType === "snippet" ? (
          <StringPayloadList
            title="Reading lines"
            values={stringList(payload.lines)}
            placeholder="Write a reading line"
            onChange={(lines) => emit({ lines })}
          />
        ) : null}

        {activityType === "word_build" ? (
          <StringPayloadList
            title="Letter tiles"
            values={stringList(payload.letters)}
            placeholder="আ"
            onChange={(letters) => emit({ letters })}
          />
        ) : null}

        {(schema?.lists ?? []).map((list) => (
          <ObjectPayloadList
            key={list.key}
            config={list}
            items={objectList(payload[list.key])}
            onChange={(items) => emit({ [list.key]: items })}
          />
        ))}

        {activityType === "picture_choice" && pictureOptions.length > 0 ? (
          <View>
            <Text style={styles.groupTitle}>Correct answer</Text>
            <View style={styles.choiceRow}>
              {pictureOptions.map((option, index) => (
                <PayloadChoice
                  key={`correct-${index}`}
                  label={valueText(option.label_bn) || `Option ${index + 1}`}
                  active={pictureAnswer === index}
                  onPress={() => emit({ answer: index })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {activityType === "multiple_choice" ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Quiz questions are visual too</Text>
            <Text style={styles.infoText}>
              Save this activity first, then open Quiz Questions to add questions,
              options and the correct answer. No JSON is needed there either.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function payloadSummary(
  type: SupabaseActivityType,
  payload: Record<string, unknown>,
) {
  switch (type) {
    case "story_snippet":
      return `${objectList(payload.slides).length} story slides`;
    case "snippet":
      return `${stringList(payload.lines).length} reading lines`;
    case "letter":
      return `Letter: ${valueText(payload.letter) || "Not set"}`;
    case "tap":
    case "drag_game":
      return `${objectList(payload.items).length} items`;
    case "word_build":
      return `Answer: ${valueText(payload.answer) || "Not set"}`;
    case "picture_choice":
      return `${objectList(payload.options).length} options`;
    case "flashcard":
      return `${objectList(payload.cards).length} flashcards`;
    case "matching":
      return `${objectList(payload.pairs).length} pairs`;
    case "audio_lesson":
      return `${objectList(payload.items).length} audio lines`;
    case "image_lesson":
      return valueText(payload.image_url) ? "Image configured" : "Image needed";
    case "video_lesson":
      return valueText(payload.video_url) ? "Video configured" : "Video needed";
    case "multiple_choice":
      return `Pass score ${valueNumber(payload.pass_score_percent, 60)}%`;
    case "puzzle":
      return `Puzzle: ${(valueText(payload.mode) || "missing letter").replace(/_/g, " ")}`;
    default:
      return "Content configured";
  }
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
    fontSize: 16,
    fontWeight: "900",
    color: "#274459",
  },
  help: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    color: "#7E8C96",
  },
  gap: { gap: 12 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#40596A",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  infoCard: {
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#EAF3F8",
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#315F85",
  },
  infoText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    color: "#698293",
  },
});
