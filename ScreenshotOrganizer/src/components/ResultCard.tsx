// ---------------------------------------------------------------------------
// Result Card - shows extraction result for a single screenshot
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExtractionResult, Language } from '../utils/types';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';

interface Props {
  result: ExtractionResult;
  language: Language;
}

export default function ResultCard({ result, language }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isZh = language === 'zh';

  return (
    <Pressable onPress={() => setExpanded(!expanded)} style={styles.card}>
      <View style={styles.topRow}>
        <Image source={{ uri: result.uri }} style={styles.thumbnail} />
        <View style={styles.info}>
          <View style={styles.tagRow}>
            <View
              style={[
                styles.tagChip,
                !result.hasUsefulText && styles.tagChipNoText,
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  !result.hasUsefulText && styles.tagTextNoText,
                ]}
              >
                {result.tag}
              </Text>
            </View>
            {result.actionable ? (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>
                  {isZh ? '有行动项' : 'Action'}
                </Text>
              </View>
            ) : null}
            {!result.hasUsefulText ? (
              <View style={styles.junkBadge}>
                <Text style={styles.junkBadgeText}>
                  {isZh ? '可删' : 'Deletable'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.summary} numberOfLines={expanded ? 10 : 2}>
            {result.summary}
          </Text>
          <Text style={styles.filename} numberOfLines={1}>
            {result.filename}
          </Text>
        </View>
      </View>

      {/* Expanded: show extracted text */}
      {expanded && result.extractedText ? (
        <View style={styles.expandedArea}>
          <Text style={styles.sectionLabel}>
            {isZh ? '提取内容：' : 'Extracted text:'}
          </Text>
          <Text style={styles.extractedText} selectable>
            {result.extractedText}
          </Text>
          {result.actionable ? (
            <>
              <Text style={styles.sectionLabelAction}>
                {isZh ? '行动项：' : 'Action:'}
              </Text>
              <Text style={styles.actionableText} selectable>
                {result.actionable}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      {result.extractedText ? (
        <Text style={styles.expandHint}>
          {expanded
            ? isZh
              ? '点击收起 ▲'
              : 'Tap to collapse ▲'
            : isZh
            ? '点击查看提取内容 ▼'
            : 'Tap to see extracted text ▼'}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgSecondary,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  tagChip: {
    backgroundColor: colors.primary + '30',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagChipNoText: {
    backgroundColor: colors.textMuted + '20',
  },
  tagText: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  tagTextNoText: {
    color: colors.textMuted,
  },
  actionBadge: {
    backgroundColor: colors.warning + '30',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionBadgeText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  junkBadge: {
    backgroundColor: colors.danger + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  junkBadgeText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  summary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  filename: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  expandedArea: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extractedText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  sectionLabelAction: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionableText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
  },
  expandHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
