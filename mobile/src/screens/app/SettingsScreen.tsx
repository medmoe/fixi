import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-lg text-black dark:text-white">Settings</Text>
      <Text className="text-gray-600 dark:text-gray-300">Coming soon…</Text>
    </View>
  );
}
