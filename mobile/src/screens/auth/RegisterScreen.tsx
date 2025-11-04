import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { register as registerApi } from '@/lib/authApi';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    try {
      setLoading(true);
      await registerApi({ name, username, email, password });
      Alert.alert('Success', 'Account created. You can sign in now.');
      navigation.navigate('Login');
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-6 text-black dark:text-white">Create your account</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 text-black dark:text-white"
        placeholder="Name"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 text-black dark:text-white"
        placeholder="Username"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 text-black dark:text-white"
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-6 text-black dark:text-white"
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable onPress={onRegister} disabled={loading} className="w-full bg-blue-600 rounded-md py-3 items-center disabled:opacity-60">
        <Text className="text-white font-semibold">{loading ? 'Creating...' : 'Create account'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()} className="mt-4">
        <Text className="text-blue-700">Back to Sign In</Text>
      </Pressable>
    </View>
  );
}
