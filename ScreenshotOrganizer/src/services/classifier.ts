// ---------------------------------------------------------------------------
// AI Content Extraction Service - reads screenshot content via vision LLM
// ---------------------------------------------------------------------------

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { AppSettings, Language } from '../utils/types';

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(language: Language): string {
  if (language === 'zh') {
    return `你是一个截图内容提取器。用户会给你一张截图。

你的任务：
1. 读取截图中所有可见的文字。
2. 判断这是什么类型的内容。
3. 提取关键信息和想法。

只返回一个 JSON 对象：
{
  "tag": "<简短标签，1-4个词，例如 'GMAT题目', '创业想法', '菜谱', '表情包', '航班预订'>",
  "has_useful_text": true/false,
  "extracted_text": "<截图中的实际文字内容，忠实提取>",
  "summary": "<1-2句话概括截图内容>",
  "actionable": "<如果有想法/待办/需要跟进的事，写清楚，否则留空>"
}

规则：
- "tag" 要根据实际内容起一个有意义的短标签（不要用笼统的分类）。
- "has_useful_text" 如果是纯表情包、空白截图、没有可读文字的UI截图，设为 false。
- "extracted_text" 要原文提取重要文字，不要改写。
- 如果有多个想法或条目，全部列出。
- "summary" 要简洁。
- "actionable" 是给想法、待办、需要跟进的事用的，没有就留空。`;
  }

  return `You are a screenshot content extractor. The user will show you a screenshot.

Your job:
1. Read ALL text visible in the screenshot.
2. Figure out what kind of content this is.
3. Extract the key information / ideas.

Respond with ONLY a JSON object:
{
  "tag": "<short tag, 1-4 words, e.g. 'GMAT question', 'business idea', 'recipe', 'meme', 'flight booking'>",
  "has_useful_text": true/false,
  "extracted_text": "<the actual text content from the screenshot, faithfully transcribed>",
  "summary": "<1-2 sentence summary of what this screenshot contains>",
  "actionable": "<if there's an idea/todo/action item, state it clearly, otherwise empty string>"
}

Rules:
- "tag" should be a meaningful short label based on the ACTUAL content (not generic categories).
- "has_useful_text" = false for memes, blank screenshots, UI-only screenshots with no readable text.
- "extracted_text" should capture the important text as-is. Don't paraphrase, extract it.
- If there are multiple ideas or items, list them all in extracted_text.
- Keep "summary" concise.
- "actionable" is for ideas, todos, things to follow up on. Leave empty if none.`;
}

// ---------------------------------------------------------------------------
// Image encoding
// ---------------------------------------------------------------------------

async function imageToBase64(uri: string): Promise<string> {
  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });
  return base64;
}

function getMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function extractWithOpenAI(
  base64: string,
  mime: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<Record<string, any>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the content from this screenshot.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mime};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return parseJsonResponse(data.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

async function extractWithAnthropic(
  base64: string,
  mime: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<Record<string, any>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime,
                data: base64,
              },
            },
            { type: 'text', text: 'Extract the content from this screenshot.' },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return parseJsonResponse(data.content[0].text);
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function parseJsonResponse(text: string): Record<string, any> {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('\n').slice(1).join('\n');
    const idx = cleaned.lastIndexOf('```');
    if (idx !== -1) cleaned = cleaned.substring(0, idx).trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}') + 1;
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.substring(start, end));
      } catch {
        // fall through
      }
    }
  }

  return {
    tag: 'parse_error',
    has_useful_text: false,
    extracted_text: '',
    summary: 'Failed to parse response',
    actionable: '',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExtractedContent {
  tag: string;
  hasUsefulText: boolean;
  extractedText: string;
  summary: string;
  actionable: string;
}

export async function extractImageContent(
  imageUri: string,
  settings: AppSettings,
): Promise<ExtractedContent> {
  const base64 = await imageToBase64(imageUri);
  const mime = getMimeType(imageUri);
  const prompt = buildSystemPrompt(settings.language);
  const model = settings.model || '';

  let raw: Record<string, any>;
  if (settings.provider === 'anthropic') {
    raw = await extractWithAnthropic(base64, mime, prompt, settings.apiKey, model);
  } else {
    raw = await extractWithOpenAI(base64, mime, prompt, settings.apiKey, model);
  }

  return {
    tag: raw.tag ?? 'unknown',
    hasUsefulText: raw.has_useful_text ?? false,
    extractedText: raw.extracted_text ?? '',
    summary: raw.summary ?? '',
    actionable: raw.actionable ?? '',
  };
}
