import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AdminActivity } from "../services/adminService";
import {
  activityTemplate,
} from "./activityTemplates";
import TeacherActivityFormBody, {
  type TeacherFormState,
} from "./TeacherActivityFormBody";
import { teacherEditorStyles as styles } from "./teacherEditorStyles";

export type TeacherActivitySave = {
  id?: string;
  orderIndex: number;
  activityType: TeacherFormState["activityType"];
  titleBn: string;
  instructionBn: string;
  payload: Record<string, unknown>;
  status: TeacherFormState["status"];
};

type Props = {
  visible: boolean;
  activity?: AdminActivity | null;
  defaultOrder: number;
  saving: boolean;
  onClose: () => void;
  onSave: (input: TeacherActivitySave) => void;
};

const newForm = (order: number): TeacherFormState => ({
  orderIndex: String(order),
  activityType: "story_snippet",
  titleBn: "",
  instructionBn: "",
  payloadText: JSON.stringify(
    activityTemplate("story_snippet"),
    null,
    2,
  ),
  status: "draft",
});

export default function TeacherActivityEditorModal({
  visible,
  activity,
  defaultOrder,
  saving,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<TeacherFormState>(
    () => newForm(defaultOrder),
  );

  useEffect(() => {
    if (!visible) return;

    if (activity) {
      setForm({
        id: activity.id,
        orderIndex: String(activity.order_index),
        activityType: activity.activity_type,
        titleBn: activity.title_bn ?? "",
        instructionBn: activity.instruction_bn ?? "",
        payloadText: JSON.stringify(
          activity.payload,
          null,
          2,
        ),
        status: activity.status,
      });
      return;
    }

    setForm(newForm(defaultOrder));
  }, [activity, defaultOrder, visible]);

  const submit = () => {
    const orderIndex = Number(form.orderIndex);

    if (
      !Number.isInteger(orderIndex) ||
      orderIndex < 1
    ) {
      Alert.alert(
        "Order required",
        "Enter a valid activity order number.",
      );
      return;
    }

    let payload: Record<string, unknown>;

    try {
      const parsed = JSON.parse(
        form.payloadText,
      ) as unknown;

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      payload = parsed as Record<string, unknown>;
    } catch {
      Alert.alert(
        "Content could not be prepared",
        "Please reopen the activity and fill the visual fields again.",
      );
      return;
    }

    onSave({
      id: form.id,
      orderIndex,
      activityType: form.activityType,
      titleBn: form.titleBn,
      instructionBn: form.instructionBn,
      payload,
      status: form.status,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.eyebrow}>
                TEACHER CONTENT BUILDER
              </Text>
              <Text style={styles.modalTitle}>
                {activity
                  ? "Edit Activity"
                  : "New Activity"}
              </Text>
            </View>

            <Pressable
              disabled={saving}
              onPress={onClose}
              style={styles.close}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            <TeacherActivityFormBody
              form={form}
              onChange={setForm}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={saving}
              onPress={onClose}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={submit}
              style={styles.save}
            >
              <Text style={styles.saveText}>
                {saving
                  ? "Saving..."
                  : "Save Activity"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
