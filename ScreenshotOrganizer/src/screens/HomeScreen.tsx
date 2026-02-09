// ---------------------------------------------------------------------------
// Home Screen - load screenshots, select, and start classification
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PhotoGrid from '../components/PhotoGrid';
import {
  fetchScreenshots,
  requestPermissions,
  ScreenshotAsset,
} from '../services/mediaLibrary';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';
import { AppSettings } from '../utils/types';

interface Props {
  settings: AppSettings;
  onNavigateSettings: () => void;
  onStartClassify: (assets: ScreenshotAsset[]) => void;
}

export default function HomeScreen({
  settings,
  onNavigateSettings,
  onStartClassify,
}: Props) {
  const [assets, setAssets] = useState<ScreenshotAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Load photos
  useEffect(() => {
    (async () => {
      const granted = await requestPermissions();
      setHasPermission(granted);
      if (granted) {
        const photos = await fetchScreenshots(200);
        setAssets(photos);
      }
      setLoading(false);
    })();
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(assets.map(a => a.id)));
  }, [assets]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleStart = () => {
    if (!settings.apiKey) {
      Alert.alert(
        settings.language === 'zh' ? '需要设置' : 'Setup Required',
        settings.language === 'zh'
          ? '请先在设置页面填写 API Key'
          : 'Please set your API key in Settings first.',
        [
          {
            text: settings.language === 'zh' ? '去设置' : 'Go to Settings',
            onPress: onNavigateSettings,
          },
          { text: settings.language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    if (selectedIds.size === 0) {
      Alert.alert(
        settings.language === 'zh' ? '未选择图片' : 'No Photos Selected',
        settings.language === 'zh'
          ? '请先选择要分类的截图'
          : 'Please select screenshots to classify.',
      );
      return;
    }

    const selected = assets.filter(a => selectedIds.has(a.id));
    onStartClassify(selected);
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {settings.language === 'zh' ? '加载相册中...' : 'Loading photos...'}
        </Text>
      </View>
    );
  }

  // No permission
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyTitle}>
          {settings.language === 'zh' ? '需要相册权限' : 'Photo Access Required'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {settings.language === 'zh'
            ? '请在系统设置中授予相册访问权限'
            : 'Please grant photo library access in Settings'}
        </Text>
      </View>
    );
  }

  // No photos
  if (assets.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyTitle}>
          {settings.language === 'zh' ? '没有找到图片' : 'No Photos Found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {settings.language === 'zh' ? '截图整理' : 'Screenshot Organizer'}
          </Text>
          <Text style={styles.subtitle}>
            {settings.language === 'zh'
              ? 'AI 帮你自动分类截图'
              : 'AI-powered screenshot sorter'}
          </Text>
        </View>
        <Pressable style={styles.settingsBtn} onPress={onNavigateSettings}>
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </Pressable>
      </View>

      {/* Photo grid */}
      <PhotoGrid
        assets={assets}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      {/* Bottom action button */}
      {selectedIds.size > 0 && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.classifyBtn} onPress={handleStart}>
            <Text style={styles.classifyBtnText}>
              {settings.language === 'zh'
                ? `开始分类 (${selectedIds.size} 张)`
                : `Classify ${selectedIds.size} Photos`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsBtnText: {
    fontSize: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.md,
    backgroundColor: colors.bgPrimary + 'F0',
  },
  classifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  classifyBtnText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
