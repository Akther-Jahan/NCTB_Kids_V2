import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { ScreenProps } from '../../../navigation/routes';
import { colors, shadows } from '../../../theme/theme';

export default function AdminLoginScreen({ navigation }: ScreenProps<'AdminLogin'>) {
  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text style={styles.icon}>🛡️</Text><Text style={styles.title}>Admin access</Text><Text style={styles.message}>Secure staff access is not available in this mobile release.</Text><Pressable style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>ফিরে যান</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F2F6F8' }, container: { flex: 1, justifyContent: 'center', padding: 25 }, icon: { fontSize: 60, textAlign: 'center' }, title: { fontSize: 30, fontWeight: '900', textAlign: 'center', color: colors.ink }, message: { marginTop: 10, textAlign: 'center', fontSize: 14, lineHeight: 21, color: colors.muted }, button: { marginTop: 16, backgroundColor: '#133A5E', borderRadius: 17, padding: 15, alignItems: 'center', ...shadows.card }, buttonText: { color: '#FFF', fontWeight: '900' } });
