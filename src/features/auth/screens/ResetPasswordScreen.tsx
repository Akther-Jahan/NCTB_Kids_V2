import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../../contexts/AuthContext';

export default function ResetPasswordScreen() {
  const {
    startPasswordRecovery,
    updatePassword,
    clearPasswordRecovery,
  } = useAuth();
  const [preparing, setPreparing] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    void startPasswordRecovery()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((recoveryError) => {
        if (active) {
          setError(
            recoveryError instanceof Error
              ? recoveryError.message
              : 'Password reset link খোলা যায়নি।'
          );
        }
      })
      .finally(() => {
        if (active) setPreparing(false);
      });

    return () => {
      active = false;
    };
  }, [startPasswordRecovery]);

  const savePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password কমপক্ষে 8 characters হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password মিলছে না', 'দুই জায়গায় একই password লিখুন।');
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      Alert.alert('Password পরিবর্তন হয়েছে', 'নতুন password এখন ব্যবহার করতে পারবেন।', [
        {
          text: 'ঠিক আছে',
          onPress: clearPasswordRecovery,
        },
      ]);
    } catch (updateError) {
      Alert.alert(
        'Password পরিবর্তন হয়নি',
        updateError instanceof Error ? updateError.message : 'আবার চেষ্টা করুন।'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (preparing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#35A853" />
          <Text style={styles.loadingText}>Secure reset link যাচাই হচ্ছে…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.card}>
          <Text style={styles.icon}>{ready ? '🔑' : '⚠️'}</Text>
          <Text style={styles.title}>
            {ready ? 'নতুন Password দিন' : 'Reset link কাজ করছে না'}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {ready ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="New password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!submitting}
              />
              <Pressable
                style={[styles.primaryButton, submitting && styles.disabled]}
                onPress={() => void savePassword()}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Save হচ্ছে…' : 'নতুন Password Save করুন'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.help}>
              নতুন reset link চাইতে Parent Login screen থেকে “Password ভুলে
              গেছেন?” চাপুন।
            </Text>
          )}

          <Pressable onPress={clearPasswordRecovery} disabled={submitting}>
            <Text style={styles.cancel}>App-এ ফিরে যান</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF7' },
  center: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '800' },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  icon: { fontSize: 48, textAlign: 'center' },
  title: {
    marginTop: 8,
    marginBottom: 18,
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 4,
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
  error: {
    marginBottom: 16,
    color: '#9F2626',
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '700',
  },
  help: {
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
  },
  cancel: {
    marginTop: 17,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },
});
