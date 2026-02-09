// ---------------------------------------------------------------------------
// App.tsx - Main entry, manages navigation between screens
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ExtractScreen from './src/screens/ClassifyScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { loadSettings, saveSettings } from './src/services/storage';
import { ScreenshotAsset } from './src/services/mediaLibrary';
import { AppSettings, DEFAULT_SETTINGS } from './src/utils/types';
import { colors } from './src/utils/theme';

type Screen = 'home' | 'settings' | 'classify';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [assetsToClassify, setAssetsToClassify] = useState<ScreenshotAsset[]>(
    [],
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
      setSettingsLoaded(true);
    });
  }, []);

  const handleSaveSettings = useCallback(
    (newSettings: AppSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
    },
    [],
  );

  const handleStartClassify = useCallback(
    (assets: ScreenshotAsset[]) => {
      setAssetsToClassify(assets);
      setScreen('classify');
    },
    [],
  );

  const handleDone = useCallback(() => {
    setAssetsToClassify([]);
    setScreen('home');
  }, []);

  if (!settingsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {screen === 'home' && (
        <HomeScreen
          settings={settings}
          onNavigateSettings={() => setScreen('settings')}
          onStartClassify={handleStartClassify}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onSave={handleSaveSettings}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'classify' && (
        <ExtractScreen
          assets={assetsToClassify}
          settings={settings}
          onDone={handleDone}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
