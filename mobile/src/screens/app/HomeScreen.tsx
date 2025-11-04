import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '@/store/auth';

export default function HomeScreen() {
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.profile?.username ?? '');

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-2xl font-bold text-black dark:text-white">Hello {username || 'there'} 👋</Text>
      <Text className="text-gray-600 dark:text-gray-300 mt-2">You're logged in.</Text>

      <Pressable onPress={logout} className="mt-6 bg-red-600 px-4 py-2 rounded">
        <Text className="text-white font-semibold">Log out</Text>
      </Pressable>
    </View>
  );
}
