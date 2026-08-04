import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { useGamificationStore } from './src/features/gamification/store/gamificationStore';
import { useStudentStore } from './src/features/student/store/studentStore';
import { useLessonSessionStore } from './src/features/learning/store/lessonSessionStore';

function AppContent() {
  const [ready, setReady] = useState(false);
  const loadProgress = useGamificationStore((state) => state.loadLocalProgress);
  const loadStudent = useStudentStore((state) => state.loadStudent);
  const loadLessonSessions = useLessonSessionStore((state) => state.loadSessions);

  useEffect(() => {
    let active = true;
    Promise.all([loadProgress(), loadStudent(), loadLessonSessions()]).catch((error) => console.warn('Local restore failed', error)).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [loadLessonSessions, loadProgress, loadStudent]);

  if (!ready) return <View style={styles.loading}><Text style={styles.tiger}>🐯</Text><ActivityIndicator size="large" color="#58C800" /><Text style={styles.loadingText}>শেখার অভিযান প্রস্তুত হচ্ছে…</Text></View>;

  return <><StatusBar style="dark" /><RootNavigator /></>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({ 
  loading: { flex: 1, 
  backgroundColor: '#FFFDF7', 
  alignItems: 'center', 
  justifyContent: 'center' }, 
  tiger: { fontSize: 75 }, 
  loadingText: { marginTop: 12, color: '#6D645A', 
  fontWeight: '900' } });