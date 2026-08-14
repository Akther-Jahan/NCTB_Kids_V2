import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScreenProps } from "../../../navigation/routes";
import {
  adminService,
  type AdminActivity,
  type AdminUser,
} from "../services/adminService";
import {
  activityLabel,
} from "../components/activityTemplates";
import {
  payloadSummary,
} from "../components/DynamicPayloadForm";
import TeacherActivityEditorModal, {
  type TeacherActivitySave,
} from "../components/TeacherActivityEditorModal";
import { teacherEditorStyles as styles } from "../components/teacherEditorStyles";

export default function AdminContentEditorScreenV2({
  navigation,
  route,
}: ScreenProps<"AdminContentEditor">) {
  const { chapterId, chapterTitle } =
    route.params;

  const [admin, setAdmin] =
    useState<AdminUser | null>(null);
  const [activities, setActivities] =
    useState<AdminActivity[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [editorVisible, setEditorVisible] =
    useState(false);
  const [editing, setEditing] =
    useState<AdminActivity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const currentAdmin =
        await adminService.getCurrentAdmin();

      if (!currentAdmin) {
        navigation.replace("AdminLogin");
        return;
      }

      setAdmin(currentAdmin);
      setActivities(
        await adminService.listActivities(
          chapterId,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Content could not be loaded",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [chapterId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const nextOrder = useMemo(
    () =>
      activities.length
        ? Math.max(
            ...activities.map(
              (item) => item.order_index,
            ),
          ) + 1
        : 1,
    [activities],
  );

  const openCreate = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const openEdit = (
    activity: AdminActivity,
  ) => {
    setEditing(activity);
    setEditorVisible(true);
  };

  const save = async (
    input: TeacherActivitySave,
  ) => {
    if (
      input.activityType ===
        "multiple_choice" &&
      input.status === "published"
    ) {
      if (!input.id) {
        Alert.alert(
          "Save quiz as Draft first",
          "Save the Quiz activity first, then add questions and publish it.",
        );
        return;
      }

      const hasQuestions =
        await adminService.hasPublishedQuizQuestions(
          chapterId,
          input.id,
        );

      if (!hasQuestions) {
        Alert.alert(
          "Published question required",
          "Add at least one published quiz question with a correct answer before publishing.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      await adminService.saveActivity({
        id: input.id,
        chapterId,
        orderIndex: input.orderIndex,
        activityType:
          input.activityType,
        titleBn: input.titleBn,
        instructionBn:
          input.instructionBn,
        payload: input.payload,
        status: input.status,
      });

      setEditorVisible(false);
      setEditing(null);
      await load();
    } catch (error) {
      Alert.alert(
        "Activity could not be saved",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = (
    activity: AdminActivity,
  ) => {
    const nextStatus =
      activity.status === "published"
        ? "draft"
        : "published";

    Alert.alert(
      "Change status?",
      `${activityLabel(
        activity.activity_type,
      )} will become ${nextStatus}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text:
            nextStatus === "published"
              ? "Publish"
              : "Unpublish",
          onPress: () => {
            void (async () => {
              try {
                if (
                  activity.activity_type ===
                    "multiple_choice" &&
                  nextStatus === "published"
                ) {
                  const hasQuestions =
                    await adminService.hasPublishedQuizQuestions(
                      chapterId,
                      activity.id,
                    );

                  if (!hasQuestions) {
                    Alert.alert(
                      "Published question required",
                      "Add a published quiz question with a correct answer first.",
                    );
                    return;
                  }
                }

                await adminService.setActivityStatus(
                  activity.id,
                  nextStatus,
                );
                await load();
              } catch (error) {
                Alert.alert(
                  "Status could not be changed",
                  error instanceof Error
                    ? error.message
                    : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const remove = (
    activity: AdminActivity,
  ) => {
    Alert.alert(
      "Delete activity?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await adminService.deleteActivity(
                  activity.id,
                );
                await load();
              } catch (error) {
                Alert.alert(
                  "Delete failed",
                  error instanceof Error
                    ? error.message
                    : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#315F85"
          />
          <Text style={styles.subtitle}>
            Loading content...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.flex}>
            <Text style={styles.eyebrow}>
              TEACHER CONTENT EDITOR
            </Text>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {chapterTitle}
            </Text>
            <Text style={styles.subtitle}>
              {admin?.role === "admin"
                ? "Admin"
                : "Content Creator"}
            </Text>
          </View>

          <Pressable
            onPress={openCreate}
            style={styles.add}
          >
            <Text style={styles.addText}>
              ＋ Add
            </Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Upload content without code
          </Text>
          <Text style={styles.heroText}>
            Choose an activity type, fill normal
            fields, add cards/options/items, select
            answers, then save. Payload JSON is
            generated automatically in the
            background.
          </Text>
        </View>

        <View style={styles.list}>
          {activities.map((activity) => (
            <View
              key={activity.id}
              style={styles.card}
            >
              <View style={styles.row}>
                <View style={styles.order}>
                  <Text
                    style={styles.orderText}
                  >
                    {activity.order_index}
                  </Text>
                </View>

                <View style={styles.flex}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                  >
                    {activity.title_bn ||
                      activityLabel(
                        activity.activity_type,
                      )}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {activityLabel(
                      activity.activity_type,
                    )}{" "}
                    · {activity.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.summary}>
                {payloadSummary(
                  activity.activity_type,
                  activity.payload,
                )}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    openEdit(activity)
                  }
                  style={styles.action}
                >
                  <Text
                    style={styles.actionText}
                  >
                    Edit Content
                  </Text>
                </Pressable>

                {activity.activity_type ===
                "multiple_choice" ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate(
                        "AdminQuizEditor",
                        {
                          chapterId,
                          chapterTitle,
                          activityId:
                            activity.id,
                        },
                      )
                    }
                    style={styles.action}
                  >
                    <Text
                      style={styles.actionText}
                    >
                      Quiz Questions
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() =>
                    togglePublish(activity)
                  }
                  style={styles.action}
                >
                  <Text
                    style={styles.actionText}
                  >
                    {activity.status ===
                    "published"
                      ? "Unpublish"
                      : "Publish"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    remove(activity)
                  }
                  style={[
                    styles.action,
                    styles.danger,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      styles.dangerText,
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {activities.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No activities yet
            </Text>
            <Text style={styles.emptyText}>
              Tap Add and choose a visual activity
              type. No JSON is required.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <TeacherActivityEditorModal
        visible={editorVisible}
        activity={editing}
        defaultOrder={nextOrder}
        saving={saving}
        onClose={() => {
          if (!saving) {
            setEditorVisible(false);
            setEditing(null);
          }
        }}
        onSave={(input) => void save(input)}
      />
    </SafeAreaView>
  );
}
