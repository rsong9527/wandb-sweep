// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { borderRadius, colors, fontSize, spacing } from '../utils/theme';
import { AppSettings, Language, Provider } from '../utils/types';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  labels,
}: {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <View style={segStyles.container}>
      {options.map(opt => (
        <Pressable
          key={opt}
          style={[segStyles.option, selected === opt && segStyles.optionActive]}
          onPress={() => onSelect(opt)}
        >
          <Text
            style={[
              segStyles.optionText,
              selected === opt && segStyles.optionTextActive,
            ]}
          >
            {labels[opt]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
  },
});

export default function SettingsScreen({ settings, onSave, onBack }: Props) {
  const [provider, setProvider] = useState<Provider>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [language, setLanguage] = useState<Language>(settings.language);

  const isZh = language === 'zh';

  const handleSave = () => {
    onSave({ provider, apiKey: apiKey.trim(), model: model.trim(), language });
    onBack();
  };

  const defaultModel =
    provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {isZh ? '返回' : 'Back'}</Text>
          </Pressable>
          <Text style={styles.title}>{isZh ? '设置' : 'Settings'}</Text>
        </View>

        {/* Language */}
        <Text style={styles.label}>{isZh ? '语言' : 'Language'}</Text>
        <SegmentedControl
          options={['zh', 'en'] as Language[]}
          selected={language}
          onSelect={setLanguage}
          labels={{ zh: '中文', en: 'English' } as Record<Language, string>}
        />

        {/* Provider */}
        <Text style={styles.label}>{isZh ? 'AI 服务商' : 'AI Provider'}</Text>
        <SegmentedControl
          options={['openai', 'anthropic'] as Provider[]}
          selected={provider}
          onSelect={setProvider}
          labels={
            { openai: 'OpenAI', anthropic: 'Anthropic' } as Record<
              Provider,
              string
            >
          }
        />

        {/* API Key */}
        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={
            provider === 'openai' ? 'sk-...' : 'sk-ant-...'
          }
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Model */}
        <Text style={styles.label}>{isZh ? '模型（可选）' : 'Model (optional)'}</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder={defaultModel}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          {isZh
            ? `留空则使用默认模型: ${defaultModel}`
            : `Leave empty for default: ${defaultModel}`}
        </Text>

        {/* Cost info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            {isZh ? '费用估算' : 'Cost Estimate'}
          </Text>
          <Text style={styles.infoText}>
            {isZh
              ? 'GPT-4o: 约 ¥0.02/张 | GPT-4o-mini: 约 ¥0.007/张\nClaude Sonnet: 约 ¥0.02/张'
              : 'GPT-4o: ~$0.003/image | GPT-4o-mini: ~$0.001/image\nClaude Sonnet: ~$0.003/image'}
          </Text>
        </View>

        {/* Save button */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isZh ? '保存设置' : 'Save Settings'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
  backBtnText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  infoBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
