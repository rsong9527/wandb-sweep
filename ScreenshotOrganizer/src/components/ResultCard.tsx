// ---------------------------------------------------------------------------
// Result Card - shows classification result for a single image
// ---------------------------------------------------------------------------

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ClassificationResult, getCategoryLabel, Language } from '../utils/types';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';

interface Props {
  result: ClassificationResult;
  language: Language;
}

export default function ResultCard({ result, language }: Props) {
  const label = getCategoryLabel(result.category, language);

  return (
    <View style={styles.card}>
      <Image source={{ uri: result.uri }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.reason} numberOfLines={2}>
          {result.reason}
        </Text>
        <Text style={styles.filename} numberOfLines={1}>
          {result.filename}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgSecondary,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  category: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  reason: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  filename: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
});
