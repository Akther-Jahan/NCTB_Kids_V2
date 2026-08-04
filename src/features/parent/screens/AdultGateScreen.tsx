import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../../contexts/AuthContext';
import type { ScreenProps } from '../../../navigation/routes';
import { colors, shadows } from '../../../theme/theme';

export default function AdultGateScreen({
  navigation,
  route,
}: ScreenProps<'AdultGate'>) {
  const { isAuthenticated, loading } = useAuth();
  const challenge = useMemo(() => ({ a: 87, b: 39, answer: 48 }), []);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    if (Number(value) !== challenge.answer) {
      setError('উত্তরটি সঠিক হয়নি। আবার চেষ্টা করুন।');
      return;
    }

    if (route.params.destination === 'admin') {
      navigation.replace('AdminLogin');
      return;
    }

    navigation.replace(isAuthenticated ? 'ParentDashboard' : 'Login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>🛡️</Text>
        <Text style={styles.title}>বড়দের জন্য</Text>
        <Text style={styles.text}>
          Parent/Admin area খুলতে প্রশ্নটির উত্তর দিন।
        </Text>

        <View style={styles.card}>
          <Text style={styles.question}>
            {challenge.a} − {challenge.b} = ?
          </Text>
          <TextInput
            value={value}
            onChangeText={(nextValue) => {
              setValue(nextValue);
              setError('');
            }}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="উত্তর"
          />
          <Pressable
            style={[styles.button, loading && styles.disabled]}
            onPress={verify}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'অপেক্ষা করুন…' : 'যাচাই করুন'}
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>ফিরে যান</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
  },
  text: {
    marginTop: 6,
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    marginTop: 22,
    padding: 22,
    backgroundColor: '#FFF',
    borderRadius: 24,
    ...shadows.card,
  },
  question: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.greenDark,
  },
  input: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
    backgroundColor: colors.orange,
    padding: 15,
    borderRadius: 17,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '900',
  },
  error: {
    marginTop: 10,
    color: colors.red,
    textAlign: 'center',
    fontWeight: '800',
  },
  cancel: {
    marginTop: 18,
    color: colors.muted,
    fontWeight: '800',
  },
});