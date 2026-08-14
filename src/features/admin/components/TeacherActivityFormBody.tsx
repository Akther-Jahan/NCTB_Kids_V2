import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type {
  PublicationStatus,
  SupabaseActivityType,
} from "../../learning/types/supabaseCurriculum";
import DynamicPayloadForm from "./DynamicPayloadForm";
import {
  activityLabel,
  activityTemplate,
  teacherActivityTypes,
} from "./activityTemplates";
import { teacherEditorStyles as styles } from "./teacherEditorStyles";

export type TeacherFormState = {
  id?: string;
  orderIndex: string;
  activityType: SupabaseActivityType;
  titleBn: string;
  instructionBn: string;
  payloadText: string;
  status: PublicationStatus;
};

export default function TeacherActivityFormBody({
  form,
  onChange,
}: {
  form: TeacherFormState;
  onChange: (form: TeacherFormState) => void;
}) {
  const set = (patch: Partial<TeacherFormState>) =>
    onChange({ ...form, ...patch });

  return (
    <View style={{ gap: 13 }}>
      <Text style={styles.label}>Activity type</Text>

      <View style={styles.chipRow}>
        {teacherActivityTypes.map((type) => {
          const active = form.activityType === type;

          return (
            <Pressable
              key={type}
              onPress={() =>
                set({
                  activityType: type,
                  payloadText: JSON.stringify(
                    activityTemplate(type),
                    null,
                    2,
                  ),
                })
              }
              style={[
                styles.chip,
                active && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                ]}
              >
                {activityLabel(type)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Order</Text>
      <TextInput
        value={form.orderIndex}
        keyboardType="number-pad"
        onChangeText={(value) =>
          set({
            orderIndex: value.replace(/[^0-9]/g, ""),
          })
        }
        style={styles.input}
      />

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={form.titleBn}
        placeholder="Example: Let’s learn letters"
        placeholderTextColor="#98A4AC"
        onChangeText={(titleBn) => set({ titleBn })}
        style={styles.input}
      />

      <Text style={styles.label}>Instruction for the child</Text>
      <TextInput
        value={form.instructionBn}
        placeholder="What should the child do?"
        placeholderTextColor="#98A4AC"
        multiline
        onChangeText={(instructionBn) =>
          set({ instructionBn })
        }
        style={[styles.input, styles.area]}
      />

      <DynamicPayloadForm
        activityType={form.activityType}
        payloadText={form.payloadText}
        onChangePayloadText={(payloadText) =>
          set({ payloadText })
        }
      />

      <Text style={styles.label}>Status</Text>

      <View style={styles.chipRow}>
        {(
          [
            "draft",
            "published",
            "archived",
          ] as PublicationStatus[]
        ).map((status) => {
          const active = form.status === status;

          return (
            <Pressable
              key={status}
              onPress={() => set({ status })}
              style={[
                styles.chip,
                active && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                ]}
              >
                {status === "draft"
                  ? "Save as Draft"
                  : status === "published"
                    ? "Publish"
                    : "Archive"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
