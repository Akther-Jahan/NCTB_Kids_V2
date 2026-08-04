import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/routes';
import { colors, shadows } from '../theme/theme';

type RouteName = 'Subjects' | 'Progress';
type ActiveRouteName = RouteName | 'Leaderboard' | 'Donation';
type Props = { navigation: any; active: ActiveRouteName };

const items: Array<{ route: RouteName; icon: string; label: string }> = [
  { route: 'Subjects', icon: '📚', label: 'Book' },
  { route: 'Progress', icon: '📊', label: 'Progress' },
];

export function BottomNav({ navigation, active }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const selected = item.route === active;
        return (
          <Pressable key={item.route} style={styles.item} onPress={() => navigation.navigate(item.route)}>
            <View style={[styles.iconBubble, selected && styles.selectedBubble]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 66,
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    ...shadows.card,
  },
  item: { flex: 1, alignItems: 'center' },
  iconBubble: { minWidth: 44, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectedBubble: { backgroundColor: colors.green },
  icon: { fontSize: 17 },
  label: { marginTop: 2, fontSize: 11, fontWeight: '700', color: colors.muted },
  selectedLabel: { color: colors.greenDark, fontWeight: '900' },
});
