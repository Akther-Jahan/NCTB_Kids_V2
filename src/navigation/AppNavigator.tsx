import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import SubjectSelectionScreen from '../features/learning/screens/SubjectSelectionScreen';
import ChapterPathScreen from '../features/learning/screens/ChapterPathScreen';
import LessonPlayerScreen from '../features/learning/screens/LessonPlayerScreen';
import ProgressScreen from '../features/progress/screens/ProgressScreen';
import AdultGateScreen from '../features/parent/screens/AdultGateScreen';
import ParentDashboardScreen from '../features/parent/screens/ParentDashboardScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Subjects" screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFDF7' } }}>
      <Stack.Screen name="Subjects" component={SubjectSelectionScreen} />
      <Stack.Screen name="ChapterPath" component={ChapterPathScreen} />
      <Stack.Screen name="Lesson" component={LessonPlayerScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="AdultGate" component={AdultGateScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
    </Stack.Navigator>
  );
}
