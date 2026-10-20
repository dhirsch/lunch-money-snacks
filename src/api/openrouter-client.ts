import type { Category } from './lunch-money-client';
import type { AmazonItem } from '../amazon/amazon-csv';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AmazonMemoSuggestion {
  itemsText: string;
  categoryId: number | null;
  categoryName: string | null;
  isSupplement: boolean;
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
    is_supplement?: unknown;
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
    isSupplement: parsed.is_supplement === true,
  };
}

async function requestCompletion(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
): Promise<string> {
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
  return content;
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
            'Choose one category_id from the provided categories if clearly appropriate. Use null if uncertain. Supplements and vitamins must be categorized as Food and Grocery (pick the closest food/grocery category), not as health or personal care.',
          is_supplement:
            'true if any item is a dietary supplement or vitamin (e.g. vitamins, minerals, herbal extracts, capsules/tinctures), otherwise false. Protein powder, food and drinks are not supplements.',
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
          is_supplement: 'boolean',
        },
      }),
    },
  ];

  const content = await requestCompletion(apiKey, model, messages);

  return parseSuggestion(content, availableCategories);
}

export interface SplitMatchTransaction {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
}

export interface SplitMatchOrder {
  orderId: string;
  date: string;
  total: number;
  items: AmazonItem[];
}

export interface SplitMatchGuess {
  transactionId: number;
  items: AmazonItem[];
}

/**
 * Validates the model's guess: transactions must come from the candidate list, each item may be
 * used once, and the matched transactions can't add up to more than the order total.
 */
export function parseSplitMatches(
  content: string,
  order: SplitMatchOrder,
  transactions: SplitMatchTransaction[],
): SplitMatchGuess[] {
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    throw new Error('OpenRouter response did not include JSON.');
  }

  const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as { matches?: unknown };
  if (!Array.isArray(parsed.matches)) return [];

  const guesses: SplitMatchGuess[] = [];
  const usedTransactions = new Set<number>();
  const usedItems = new Set<number>();
  let matchedCents = 0;

  for (const match of parsed.matches as Array<{ transaction_id?: unknown; item_numbers?: unknown }>) {
    const tx = transactions.find((candidate) => candidate.id === match.transaction_id);
    if (!tx || usedTransactions.has(tx.id) || !Array.isArray(match.item_numbers)) continue;

    const numbers = match.item_numbers as unknown[];
    const valid = numbers.every(
      (n) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= order.items.length && !usedItems.has(n as number),
    );
    if (!valid || numbers.length === 0 || new Set(numbers).size !== numbers.length) continue;

    matchedCents += Math.round(Math.abs(tx.amount) * 100);
    if (matchedCents > Math.round(order.total * 100) + 1) return [];

    usedTransactions.add(tx.id);
    for (const n of numbers as number[]) usedItems.add(n);
    guesses.push({
      transactionId: tx.id,
      items: (numbers as number[]).map((n) => order.items[n - 1]),
    });
  }

  return guesses;
}

export async function guessSplitMatches(
  apiKey: string,
  model: string,
  order: SplitMatchOrder,
  transactions: SplitMatchTransaction[],
): Promise<SplitMatchGuess[]> {
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content:
        'You match one Amazon order that was billed in several separate charges to the bank transactions that paid for it. Amazon charges per shipment, and each charge includes tax and shipping, so a charge is slightly more than the sum of its items. Only return matches you are confident about. Return only JSON.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        order: {
          order_date: order.date,
          order_total: order.total,
          items: order.items.map((item, i) => ({
            item_number: i + 1,
            title: item.title,
            quantity: item.quantity,
            unit_price: item.price,
          })),
        },
        candidate_transactions: transactions.map((tx) => ({
          transaction_id: tx.id,
          date: tx.date,
          amount: Math.abs(tx.amount),
          notes: tx.notes,
        })),
        instructions:
          'Pick the candidate transactions that are charges for this order, and say which items each one paid for. Every item should be assigned to exactly one chosen transaction, and the chosen transaction amounts should add up to about the order total. Return an empty matches array if there is no confident answer.',
        response_shape: {
          matches: [{ transaction_id: 'number', item_numbers: ['item_number values'] }],
        },
      }),
    },
  ];

  const content = await requestCompletion(apiKey, model, messages);
  return parseSplitMatches(content, order, transactions);
}
