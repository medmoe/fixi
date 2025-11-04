import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store for tests
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Silence React Native Reanimated warning
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
