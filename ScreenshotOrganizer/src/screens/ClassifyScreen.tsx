// ---------------------------------------------------------------------------
// Extract Screen - shows progress and extraction results
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ResultCard from '../components/ResultCard';
import { extractImageContent } from '../services/classifier';
import { ScreenshotAsset } from '../services/mediaLibrary';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';
import { AppSettings, ExtractionResult } from '../utils/types';

interface Props {
  assets: ScreenshotAsset[];
  settings: AppSettings;
  onDone: () => void;
}

export default function ExtractScreen({ assets, settings, onDone }: Props) {
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'extracting' | 'done'>('extracting');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const isZh = settings.language === 'zh';

  // Run extraction
  useEffect(() => {
    cancelled.current = false;

    (async () => {
      const allResults: ExtractionResult[] = [];

      for (let i = 0; i < assets.length; i++) {
        if (cancelled.current) break;
        setCurrent(i + 1);

        try {
          const extracted = await extractImageContent(assets[i].uri, settings);
          const result: ExtractionResult = {
            uri: assets[i].uri,
            filename: assets[i].filename,
            tag: extracted.tag,
            hasUsefulText: extracted.hasUsefulText,
            extractedText: extracted.extractedText,
            summary: extracted.summary,
            actionable: extracted.actionable,
            timestamp: Date.now(),
          };
          allResults.push(result);
          setResults([...allResults]);
        } catch (e: any) {
          const result: ExtractionResult = {
            uri: assets[i].uri,
            filename: assets[i].filename,
            tag: 'error',
            hasUsefulText: false,
            extractedText: '',
            summary: `Error: ${e.message?.substring(0, 80) ?? 'Unknown'}`,
            actionable: '',
            timestamp: Date.now(),
          };
          allResults.push(result);
          setResults([...allResults]);

          if (e.message?.includes('401') || e.message?.includes('403')) {
            setError(
              isZh
                ? 'API Key 无效，请检查设置'
                : 'Invalid API key. Please check Settings.',
            );
            break;
          }
        }
      }

      if (!cancelled.current) setPhase('done');
    })();

    return () => {
      cancelled.current = true;
    };
  }, []);

  // Build stats
  const tagCounts: Record<string, number> = {};
  let usefulCount = 0;
  let actionableCount = 0;
  results.forEach(r => {
    tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1;
    if (r.hasUsefulText) usefulCount++;
    if (r.actionable) actionableCount++;
  });
  const deletableCount = results.length - usefulCount;
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // Export as text
  const handleExport = async () => {
    let text = isZh ? '# 截图内容提取\n\n' : '# Screenshot Extraction\n\n';

    // Actionable items first
    const actionable = results.filter(r => r.actionable);
    if (actionable.length > 0) {
      text += isZh ? '## 行动项 / 想法\n\n' : '## Action Items / Ideas\n\n';
      for (const r of actionable) {
        text += `- [ ] **${r.tag}**: ${r.actionable}\n`;
        text += `  (${r.filename})\n`;
      }
      text += '\n';
    }

    // All extracted text by tag
    const byTag: Record<string, ExtractionResult[]> = {};
    results.forEach(r => {
      byTag[r.tag] = byTag[r.tag] || [];
      byTag[r.tag].push(r);
    });

    for (const [tag, items] of Object.entries(byTag)) {
      text += `## ${tag} (${items.length})\n\n`;
      for (const item of items) {
        text += `### ${item.filename}\n`;
        text += `> ${item.summary}\n\n`;
        if (item.extractedText) {
          text += `${item.extractedText}\n\n`;
        }
        if (!item.hasUsefulText) {
          text += isZh ? '*可以删除*\n\n' : '*Safe to delete*\n\n';
        }
      }
    }

    try {
      await Share.share({ message: text, title: isZh ? '截图提取内容' : 'Screenshot Extractions' });
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {phase === 'extracting'
            ? isZh ? '正在提取内容...' : 'Extracting...'
            : isZh ? '提取完成!' : 'Extraction Done!'}
        </Text>

        {phase !== 'done' && !error && (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.progressText}>
              {current} / {assets.length}
            </Text>
          </View>
        )}

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

      {/* Stats summary */}
      {results.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{usefulCount}</Text>
            <Text style={styles.statLabel}>{isZh ? '有内容' : 'Useful'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {actionableCount}
            </Text>
            <Text style={styles.statLabel}>{isZh ? '有想法' : 'Ideas'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>
              {deletableCount}
            </Text>
            <Text style={styles.statLabel}>{isZh ? '可删' : 'Deletable'}</Text>
          </View>
        </View>
      )}

      {/* Tag chips */}
      {sortedTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {sortedTags.map(([tag, count]) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>
                {tag} ({count})
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
              ? '原始截图未做任何改动。你可以根据上面的结果手动决定删哪些。'
              : 'Originals untouched. Review results above and manually delete what you want.'}
          </Text>
        </View>
      )}

      {/* Bottom buttons */}
      {(phase === 'done' || error) && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportBtnText}>
              {isZh ? '导出提取内容' : 'Export Extracted Text'}
            </Text>
          </Pressable>
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
    paddingBottom: spacing.sm,
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: colors.success,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 200,
  },
  safetyBox: {
    marginHorizontal: spacing.md,
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
    gap: spacing.sm,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
