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

export interface Category {
  key: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
}

export interface ClassificationResult {
  uri: string;
  filename: string;
  category: string;
  reason: string;
  timestamp: number;
}

export interface ClassificationProgress {
  total: number;
  completed: number;
  current: string;
  results: ClassificationResult[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES: Category[] = [
  { key: 'receipts_payments', labelEn: 'Receipts & Payments', labelZh: '收据/付款', emoji: '🧾' },
  { key: 'chat_conversations', labelEn: 'Chats', labelZh: '聊天对话', emoji: '💬' },
  { key: 'social_media', labelEn: 'Social Media', labelZh: '社交媒体', emoji: '📱' },
  { key: 'memes_funny', labelEn: 'Memes & Funny', labelZh: '表情包/搞笑', emoji: '😂' },
  { key: 'articles_webpages', labelEn: 'Articles & Web', labelZh: '文章/网页', emoji: '📰' },
  { key: 'code_terminal', labelEn: 'Code & Terminal', labelZh: '代码/终端', emoji: '💻' },
  { key: 'maps_navigation', labelEn: 'Maps', labelZh: '地图/导航', emoji: '🗺️' },
  { key: 'settings_system', labelEn: 'Settings & System', labelZh: '设置/系统', emoji: '⚙️' },
  { key: 'photos_selfies', labelEn: 'Photos & Selfies', labelZh: '照片/自拍', emoji: '📸' },
  { key: 'shopping', labelEn: 'Shopping', labelZh: '购物', emoji: '🛒' },
  { key: 'schedules_calendars', labelEn: 'Schedules', labelZh: '日程/日历', emoji: '📅' },
  { key: 'documents', labelEn: 'Documents', labelZh: '文档', emoji: '📄' },
  { key: 'gaming', labelEn: 'Gaming', labelZh: '游戏', emoji: '🎮' },
  { key: 'junk', labelEn: 'Junk', labelZh: '垃圾', emoji: '🗑️' },
  { key: 'other', labelEn: 'Other', labelZh: '其他', emoji: '📦' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  language: 'zh',
};

export function getCategoryLabel(key: string, language: Language): string {
  const cat = CATEGORIES.find(c => c.key === key);
  if (!cat) return key;
  return language === 'zh' ? `${cat.emoji} ${cat.labelZh}` : `${cat.emoji} ${cat.labelEn}`;
}

export function getCategoryEmoji(key: string): string {
  const cat = CATEGORIES.find(c => c.key === key);
  return cat?.emoji ?? '📦';
}
