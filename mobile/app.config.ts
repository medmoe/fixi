import type { ExpoConfig } from "expo/config";
import * as dotenv from "dotenv";

// Load env from .env at project root of mobile
dotenv.config();

const APP_NAME = process.env.APP_NAME || "Fixi";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

const config: ExpoConfig = {
  name: APP_NAME,
  slug: "fixi-mobile",
  scheme: "fixi",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.yourorg.fixi"
  },
  android: {
    package: process.env.ANDROID_PACKAGE || "com.yourorg.fixi"
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
    env: process.env.APP_ENV || "development"
  },
  experiments: {
    typedRoutes: false
  }
};

export default config;
