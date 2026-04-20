// AsyncStorage wrapper for app data persistence
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData } from './types';
import { INITIAL_APP_DATA } from './types';

const STORAGE_KEY = '@echoType:appData';

export class Storage {
  // Load all app data
  static async load(): Promise<AppData> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return INITIAL_APP_DATA;
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to load app data:', error);
      return INITIAL_APP_DATA;
    }
  }

  // Save all app data
  static async save(data: AppData): Promise<void> {
    try {
      const json = JSON.stringify(data);
      await AsyncStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.error('Failed to save app data:', error);
      throw error;
    }
  }

  // Clear all app data
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear app data:', error);
      throw error;
    }
  }

  // Get storage size (for debugging)
  static async getSize(): Promise<number> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? json.length : 0;
    } catch (error) {
      console.error('Failed to get storage size:', error);
      return 0;
    }
  }
}

export * from './types';
