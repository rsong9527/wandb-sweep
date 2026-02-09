// ---------------------------------------------------------------------------
// AI Classification Service - calls OpenAI or Anthropic vision API
// ---------------------------------------------------------------------------

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { AppSettings, CATEGORIES, Language } from '../utils/types';

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(language: Language): string {
  const cats = CATEGORIES.map(c => (language === 'zh' ? c.labelZh : c.key));
  const catList = cats.map(c => `- ${c}`).join('\n');

  if (language === 'zh') {
    return `你是一个截图分类器。用户会给你一张截图。
你需要把它归到以下类别中的一个：

${catList}

规则：
1. 只返回一个 JSON 对象：{"category": "<类别key>", "reason": "<简短原因>"}
2. "category" 的值必须是以下之一：${CATEGORIES.map(c => c.key).join(', ')}
3. 如果截图模糊、空白、误触或没有有用内容，归类为 "junk"。
4. reason 用中文，不超过15个字。`;
  }

  return `You are a screenshot classifier. The user will show you a screenshot image.
Classify it into EXACTLY ONE of the following categories:

${catList}

Rules:
1. Respond with ONLY a JSON object: {"category": "<category_key>", "reason": "<brief reason>"}
2. The "category" value MUST be one of: ${CATEGORIES.map(c => c.key).join(', ')}
3. If the screenshot is blurry, blank, accidental, or useless, classify as "junk".
4. Keep the reason under 15 words.`;
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
  return 'image/jpeg'; // default
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function classifyWithOpenAI(
  base64: string,
  mime: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<{ category: string; reason: string }> {
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
            { type: 'text', text: 'Please classify this screenshot.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mime};base64,${base64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 200,
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

async function classifyWithAnthropic(
  base64: string,
  mime: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<{ category: string; reason: string }> {
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
      max_tokens: 200,
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
            { type: 'text', text: 'Please classify this screenshot.' },
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

function parseJsonResponse(text: string): { category: string; reason: string } {
  let cleaned = text.trim();
  // Remove markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('\n').slice(1).join('\n');
    const idx = cleaned.lastIndexOf('```');
    if (idx !== -1) cleaned = cleaned.substring(0, idx).trim();
  }

  try {
    const obj = JSON.parse(cleaned);
    return validateCategory(obj);
  } catch {
    // Try to extract JSON from text
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}') + 1;
    if (start !== -1 && end > start) {
      try {
        const obj = JSON.parse(cleaned.substring(start, end));
        return validateCategory(obj);
      } catch {
        // fall through
      }
    }
  }

  return { category: 'other', reason: 'Failed to parse response' };
}

function validateCategory(obj: { category?: string; reason?: string }): {
  category: string;
  reason: string;
} {
  const validKeys = CATEGORIES.map(c => c.key);
  let category = obj.category ?? 'other';
  const reason = obj.reason ?? '';

  if (!validKeys.includes(category)) {
    // Try fuzzy match
    const lower = category.toLowerCase();
    const match = validKeys.find(
      k => k.includes(lower) || lower.includes(k),
    );
    category = match ?? 'other';
  }

  return { category, reason };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function classifyImage(
  imageUri: string,
  settings: AppSettings,
): Promise<{ category: string; reason: string }> {
  const base64 = await imageToBase64(imageUri);
  const mime = getMimeType(imageUri);
  const prompt = buildSystemPrompt(settings.language);
  const model = settings.model || '';

  if (settings.provider === 'anthropic') {
    return classifyWithAnthropic(base64, mime, prompt, settings.apiKey, model);
  }
  return classifyWithOpenAI(base64, mime, prompt, settings.apiKey, model);
}
