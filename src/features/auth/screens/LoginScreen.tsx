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

export default function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('তথ্য প্রয়োজন', 'Email এবং password লিখুন।');
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });

      navigation.replace('ParentDashboard');
    } catch (error) {
      Alert.alert(
        'Login হয়নি',
        error instanceof Error ? error.message : 'আবার চেষ্টা করুন।'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.icon}>👪</Text>
        <Text style={styles.title}>Parent Login</Text>
        <Text style={styles.subtitle}>
          সন্তানের progress ও cloud backup দেখার জন্য login করুন।
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Parent email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.primaryButton, submitting && styles.disabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Login হচ্ছে…' : 'Login'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={submitting}
        >
          <Text style={styles.forgot}>Password ভুলে গেছেন?</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Register')}
          disabled={submitting}
        >
          <Text style={styles.link}>নতুন Parent account তৈরি করুন</Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.cancel}>ফিরে যান</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    elevation: 3,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#35A853',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: '#1289B1',
    fontWeight: '800',
  },
  forgot: {
    marginTop: 15,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '800',
  },
  cancel: {
    marginTop: 16,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
  },
});
