import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GateStackParamList } from '../../../navigation/RootNavigator';
import { useStudentStore } from '../store/studentStore';
import { colors, shadows } from '../../../theme/theme';

type Props = NativeStackScreenProps<GateStackParamList, 'StudentSetup'>;

const classButtons = [
  { level: 1, color: colors.blue, icon: '☻' },
  { level: 2, color: colors.orange, icon: '🏆' },
  { level: 3, color: colors.green, icon: '📖' },
];

export default function StudentSetupScreen({ navigation: _navigation }: Props) {
  const createStudent = useStudentStore((state) => state.createStudent);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [creating, setCreating] = useState<number | null>(null);

  const chooseClass = async (level: number) => {
    if (creating) return;
    setCreating(level);
    try {
      await createStudent(level);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Student account তৈরি করা যায়নি।';

      Alert.alert(
        'Account তৈরি হয়নি',
        `${message}\n\nইন্টারনেট এবং Supabase configuration পরীক্ষা করে আবার চেষ্টা করো।`
      );
    } finally {
      setCreating(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.questionBubble}><Text style={styles.question}>{language === 'bn' ? 'তুমি কোন ক্লাসে পড়ো?' : 'Which class are you in?'}</Text></View>
        <View style={styles.pointer} />
        <Image source={require('../../../../assets/images/tiger.png')} style={styles.tiger} resizeMode="contain" />

        <View style={styles.buttons}>
          {classButtons.map((item) => (
            <Pressable key={item.level} style={[styles.classButton, { backgroundColor: item.color }]} onPress={() => chooseClass(item.level)}>
              {creating === item.level ? <ActivityIndicator color="#263238" /> : <>
                <Text style={styles.classIcon}>{item.icon}</Text>
                <Text style={styles.classText}>{language === 'bn' ? `ক্লাস ${['১', '২', '৩'][item.level - 1]}` : `Class ${item.level}`}</Text>
              </>}
            </Pressable>
          ))}
        </View>

        <View style={styles.languageSwitch}>
          <Pressable style={[styles.languageOption, language === 'bn' && styles.languageActive]} onPress={() => setLanguage('bn')}><Text style={[styles.languageText, language === 'bn' && styles.languageActiveText]}>বাংলা</Text></Pressable>
          <Pressable style={[styles.languageOption, language === 'en' && styles.languageActive]} onPress={() => setLanguage('en')}><Text style={[styles.languageText, language === 'en' && styles.languageActiveText]}>English</Text></Pressable>
        </View>
        <View style={styles.idCard}><Text style={styles.idIcon}>🪪</Text><View><Text style={styles.idLabel}>STUDENT ID</Text><Text style={styles.idValue}>Class বেছে নিলে তৈরি হবে</Text></View></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F5' },
  container: { flex: 1, padding: 18, alignItems: 'center' },
  questionBubble: { marginTop: 12, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: '#FFF', borderRadius: 22, borderWidth: 2, borderColor: '#B7C4CE', ...shadows.card },
  question: { fontSize: 18, fontWeight: '900', color: '#263238' },
  pointer: { width: 18, height: 18, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }], marginTop: -9, borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#B7C4CE' },
  tiger: { width: 135, height: 135, marginTop: 2 },
  buttons: { width: '100%', gap: 14, marginTop: 12 },
  classButton: { height: 104, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)', borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center' },
  classIcon: { fontSize: 25, color: '#253238' },
  classText: { marginTop: 5, fontSize: 19, fontWeight: '900', color: '#263238' },
  languageSwitch: { marginTop: 20, flexDirection: 'row', padding: 3, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  languageOption: { paddingVertical: 7, paddingHorizontal: 17, borderRadius: 16 },
  languageActive: { backgroundColor: '#1289B1' },
  languageText: { fontSize: 12, fontWeight: '800', color: '#263238' },
  languageActiveText: { color: '#FFF' },
  idCard: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: '#BFD4E2' },
  idIcon: { fontSize: 22 }, idLabel: { fontSize: 9, fontWeight: '900', color: '#51606B' }, idValue: { fontSize: 12, fontWeight: '800', color: '#174F72' },
});