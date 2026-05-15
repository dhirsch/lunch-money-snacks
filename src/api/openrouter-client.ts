import type { Category } from './lunch-money-client';
import type { AmazonItem } from '../amazon/amazon-csv';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AmazonMemoSuggestion {
  itemsText: string;
  categoryId: number | null;
  categoryName: string | null;
}

interface OpenRouterMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function getAvailableCategories(categories: Category[]): Array<{ id: number; name: string }> {
  const results: Array<{ id: number; name: string }> = [];
  for (const category of categories) {
    if (!category.is_group && !category.archived && !category.is_income) {
      results.push({ id: category.id, name: category.name });
    }
    for (const child of category.children ?? []) {
      if (!child.archived) {
        results.push({ id: child.id, name: `${category.name} > ${child.name}` });
      }
    }
  }
  return results;
}

function parseSuggestion(content: string, categories: Array<{ id: number; name: string }>): AmazonMemoSuggestion {
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('OpenRouter response did not include JSON.');
  }

  const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as {
    items?: unknown;
    category_id?: unknown;
  };

  const itemsText = typeof parsed.items === 'string' ? parsed.items.trim() : '';
  if (!itemsText) {
    throw new Error('OpenRouter response did not include an item summary.');
  }

  const categoryId = typeof parsed.category_id === 'number' ? parsed.category_id : null;
  const category = categories.find((candidate) => candidate.id === categoryId) ?? null;

  return {
    itemsText,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
  };
}

export async function summarizeAmazonItems(
  apiKey: string,
  model: string,
  items: AmazonItem[],
  categories: Category[],
): Promise<AmazonMemoSuggestion> {
  const availableCategories = getAvailableCategories(categories);
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content:
        'You summarize Amazon item titles for a personal finance transaction memo and choose the best existing Lunch Money category. Ignore brands unless they are essential. Return only JSON.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        instructions: {
          items:
            'Write a short comma-separated item summary. Do not include the "Items:" prefix. Keep each item short and generic.',
          category_id:
            'Choose one category_id from the provided categories if clearly appropriate. Use null if uncertain.',
        },
        amazon_items: items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
        categories: availableCategories,
        response_shape: {
          items: 'short item summary',
          category_id: 'number or null',
        },
      }),
    },
  ];

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://my.lunchmoney.app',
      'X-Title': 'Lunch Money Budget Enhancer',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    let message = response.statusText || `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.error?.message === 'string') {
        message = body.error.message;
      }
    } catch {
      // Keep status text.
    }
    throw new Error(`OpenRouter request failed: ${message}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter response did not include a message.');
  }

  return parseSuggestion(content, availableCategories);
}
