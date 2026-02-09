// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Provider = 'openai' | 'anthropic';
export type Language = 'en' | 'zh';

export interface AppSettings {
  provider: Provider;
  apiKey: string;
  model: string;
  language: Language;
}

export interface ExtractionResult {
  uri: string;
  filename: string;
  tag: string;
  hasUsefulText: boolean;
  extractedText: string;
  summary: string;
  actionable: string;
  timestamp: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  language: 'zh',
};
