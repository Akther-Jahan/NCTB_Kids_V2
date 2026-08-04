import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { useAuth } from '../../../contexts/AuthContext';
import type { ScreenProps } from '../../../navigation/routes';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: ScreenProps<'Register'>) {
  const { registerParent } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('তথ্য প্রয়োজন', 'সবগুলো field পূরণ করুন।');
      return;
    }

    if (!emailPattern.test(email.trim().toLowerCase())) {
      Alert.alert('সঠিক Email দিন', 'Parent account-এর valid email লিখুন।');
      return;
    }

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
      const result = await registerParent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.requiresEmailConfirmation) {
        Alert.alert(
          'Email confirm করুন',
          'Supabase থেকে পাঠানো confirmation email-এর link চাপুন। তারপর app-এ ফিরে Login করুন।',
          [
            {
              text: 'ঠিক আছে',
              onPress: () => navigation.replace('Login'),
            },
          ]
        );
        return;
      }

      navigation.replace('ParentDashboard');
    } catch (error) {
      Alert.alert(
        'Account তৈরি হয়নি',
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
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.icon}>☁️</Text>
        <Text style={styles.title}>Create Parent Account</Text>
        <Text style={styles.subtitle}>
          এই account দিয়ে একাধিক শিশুকে link এবং progress restore করতে পারবেন।
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Parent name"
          value={name}
          onChangeText={setName}
        />
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
          placeholder="Password (minimum 8 characters)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable
          style={[styles.primaryButton, submitting && styles.disabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Account তৈরি হচ্ছে…' : 'Create Parent Account'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.replace('Login')}
          disabled={submitting}
        >
          <Text style={styles.link}>Account থাকলে Login করুন</Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.cancel}>ফিরে যান</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  container: {
    flexGrow: 1,
    padding: 22,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
  },
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
    backgroundColor: '#FFFFFF',
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
  cancel: {
    marginTop: 16,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
  },
});
