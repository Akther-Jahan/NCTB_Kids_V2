import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../../contexts/AuthContext';
import type { ScreenProps } from '../../../navigation/routes';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({
  navigation,
}: ScreenProps<'ForgotPassword'>) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      Alert.alert('সঠিক Email দিন', 'Parent account-এর valid email লিখুন।');
      return;
    }

    setSubmitting(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setSent(true);
    } catch (error) {
      Alert.alert(
        'Reset link পাঠানো যায়নি',
        error instanceof Error ? error.message : 'আবার চেষ্টা করুন।'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.icon}>{sent ? '📨' : '🔐'}</Text>
        <Text style={styles.title}>
          {sent ? 'Email পরীক্ষা করুন' : 'Password Reset'}
        </Text>
        <Text style={styles.subtitle}>
          {sent
            ? 'Account থাকলে password reset link পাঠানো হয়েছে। Email-এর link একই Android ফোনে খুলুন।'
            : 'Parent account-এর email দিলে secure password reset link পাঠানো হবে।'}
        </Text>

        {!sent ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Parent email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <Pressable
              style={[styles.primaryButton, submitting && styles.disabled]}
              onPress={() => void sendResetLink()}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'পাঠানো হচ্ছে…' : 'Reset Link পাঠান'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.primaryButtonText}>Login screen-এ ফিরুন</Text>
          </Pressable>
        )}

        <Pressable onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.cancel}>ফিরে যান</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
  },
  card: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  icon: { fontSize: 48, textAlign: 'center' },
  title: {
    marginTop: 8,
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 12,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#35A853',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: { opacity: 0.6 },
  cancel: {
    marginTop: 17,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
  },
});
