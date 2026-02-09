// ---------------------------------------------------------------------------
// Classify Screen - shows progress and results
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ResultCard from '../components/ResultCard';
import { classifyImage } from '../services/classifier';
import { organizeAssetIntoAlbum, ScreenshotAsset } from '../services/mediaLibrary';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';
import {
  AppSettings,
  CATEGORIES,
  ClassificationResult,
  getCategoryLabel,
} from '../utils/types';

interface Props {
  assets: ScreenshotAsset[];
  settings: AppSettings;
  onDone: () => void;
}

export default function ClassifyScreen({ assets, settings, onDone }: Props) {
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'classifying' | 'tagging' | 'done'>(
    'classifying',
  );
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  // Run classification
  useEffect(() => {
    cancelled.current = false;

    (async () => {
      const allResults: ClassificationResult[] = [];

      for (let i = 0; i < assets.length; i++) {
        if (cancelled.current) break;
        setCurrent(i + 1);

        try {
          const { category, reason } = await classifyImage(
            assets[i].uri,
            settings,
          );
          const result: ClassificationResult = {
            uri: assets[i].uri,
            filename: assets[i].filename,
            category,
            reason,
            timestamp: Date.now(),
          };
          allResults.push(result);
          setResults([...allResults]);
        } catch (e: any) {
          // On error, mark as 'other' and continue
          const result: ClassificationResult = {
            uri: assets[i].uri,
            filename: assets[i].filename,
            category: 'other',
            reason: `Error: ${e.message?.substring(0, 50) ?? 'Unknown'}`,
            timestamp: Date.now(),
          };
          allResults.push(result);
          setResults([...allResults]);

          // If it's an auth error, stop early
          if (e.message?.includes('401') || e.message?.includes('403')) {
            setError(
              settings.language === 'zh'
                ? 'API Key 无效，请检查设置'
                : 'Invalid API key. Please check Settings.',
            );
            return;
          }
        }
      }

      if (cancelled.current) return;

      // Phase 2: tag into albums (originals are NEVER deleted or moved)
      setPhase('tagging');
      for (let i = 0; i < allResults.length; i++) {
        if (cancelled.current) break;
        const r = allResults[i];
        const asset = assets[i];
        const catLabel =
          CATEGORIES.find(c => c.key === r.category)?.[
            settings.language === 'zh' ? 'labelZh' : 'labelEn'
          ] ?? r.category;

        await organizeAssetIntoAlbum(asset.id, catLabel);
      }

      setPhase('done');
    })();

    return () => {
      cancelled.current = true;
    };
  }, []);

  // Build summary stats
  const stats: Record<string, number> = {};
  results.forEach(r => {
    stats[r.category] = (stats[r.category] || 0) + 1;
  });
  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);

  const isZh = settings.language === 'zh';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {phase === 'classifying'
            ? isZh
              ? '正在识别...'
              : 'Classifying...'
            : phase === 'tagging'
            ? isZh
              ? '正在打标签...'
              : 'Tagging into Albums...'
            : isZh
            ? '标签完成!'
            : 'Tagging Done!'}
        </Text>

        {phase !== 'done' && !error && (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.progressText}>
              {current} / {assets.length}
            </Text>
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(results.length / assets.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Summary stats */}
      {sortedStats.length > 0 && (
        <View style={styles.statsContainer}>
          {sortedStats.map(([key, count]) => (
            <View key={key} style={styles.statChip}>
              <Text style={styles.statChipText}>
                {getCategoryLabel(key, settings.language)} {count}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item, idx) => `${item.filename}-${idx}`}
        renderItem={({ item }) => (
          <ResultCard result={item} language={settings.language} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Safety notice */}
      {phase === 'done' && (
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>
            {isZh
              ? '🔒 所有原图保持不变，仅添加到相册标签中，未删除任何照片。'
              : '🔒 All originals untouched. Photos were only added to album tags — nothing was deleted.'}
          </Text>
        </View>
      )}

      {/* Bottom button */}
      {(phase === 'done' || error) && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.doneBtn} onPress={onDone}>
            <Text style={styles.doneBtnText}>
              {isZh ? '返回首页' : 'Back to Home'}
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.bgCard,
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  errorBox: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.danger + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  statChip: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 180,
  },
  safetyBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  safetyText: {
    color: colors.success,
    fontSize: fontSize.sm,
    lineHeight: 20,
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
  doneBtn: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneBtnText: {
    color: colors.bgPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
