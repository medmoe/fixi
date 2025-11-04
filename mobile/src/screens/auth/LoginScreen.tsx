import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { login } from '@/lib/authApi';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const setToken = useAuthStore((s) => s.setToken);
  const loading = useAuthStore((s) => s.loading);
  const setLoading = useAuthStore((s) => s.setLoading);

  const onLogin = async () => {
    try {
      setLoading(true);
      const token = await login({ username, password });
      setToken(token);
    } catch (e: any) {
      Alert.alert('Login failed', e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-black dark:text-white">Welcome to Fixi</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 text-black dark:text-white"
        placeholder="Username"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-6 text-black dark:text-white"
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        className="w-full bg-blue-600 rounded-md py-3 items-center disabled:opacity-60"
      >
        <Text className="text-white font-semibold">{loading ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')} className="mt-4">
        <Text className="text-blue-700">Create an account</Text>
      </Pressable>
    </View>
  );
}
