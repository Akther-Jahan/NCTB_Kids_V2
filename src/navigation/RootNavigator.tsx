import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useStudentStore } from '../features/student/store/studentStore';
import { useAuth } from '../contexts/AuthContext';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import StudentSetupScreen from '../features/student/screens/StudentSetupScreen';
import AppNavigator from './AppNavigator';

export type GateStackParamList = {
  StudentSetup: undefined;
  MainApp: undefined;
  PasswordRecovery: undefined;
};

const Stack = createNativeStackNavigator<GateStackParamList>();

export default function RootNavigator() {
  const student = useStudentStore((state) => state.student);
  const { recoveryUrl } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {recoveryUrl ? (
          <Stack.Screen
            name="PasswordRecovery"
            component={ResetPasswordScreen}
          />
        ) : student ? (
          <Stack.Screen name="MainApp" component={AppNavigator} />
        ) : (
          <Stack.Screen name="StudentSetup" component={StudentSetupScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
