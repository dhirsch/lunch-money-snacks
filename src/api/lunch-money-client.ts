export const BASE_URL = 'https://api.lunchmoney.dev/v2';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  updated_at: string;
  created_at: string;
  group_id: number | null;
  is_group: boolean;
  children?: ChildCategory[];
  archived: boolean;
  archived_at: string | null;
  order: number | null;
  collapsed: boolean;
}

export interface ChildCategory {
  id: number;
  name: string;
  description: string | null;
  updated_at: string;
  created_at: string;
  group_id: number | null;
  is_group: false;
  archived: boolean;
  archived_at: string | null;
  order: number | null;
  collapsed: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
  is_income?: boolean;
  exclude_from_budget?: boolean;
  exclude_from_totals?: boolean;
  is_group?: boolean;
  group_id?: number | null;
  archived?: boolean;
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  archived: boolean;
}

export interface Transaction {
  id: number;
  date: string;
  amount: string;
  currency: string;
  to_base: number;
  recurring_id: number | null;
  payee: string;
  category_id: number | null;
  plaid_account_id?: number | null;
  manual_account_id?: number | null;
  external_id: string | null;
  tag_ids: number[];
  notes: string | null;
  status: 'reviewed' | 'unreviewed' | 'delete_pending';
  is_pending: boolean;
  created_at: string;
  updated_at: string;
  is_split_parent?: boolean;
  split_parent_id: number | null;
  is_group_parent: boolean;
  group_parent_id: number | null;
  source: string | null;
  custom_metadata?: Record<string, unknown> | null;
  plaid_metadata?: Record<string, unknown> | null;
}

export interface GetTransactionsParams {
  start_date: string;
  end_date: string;
  category_id?: number;
  manual_account_id?: number;
  plaid_account_id?: number;
  recurring_id?: number;
  tag_id?: number;
  status?: 'reviewed' | 'unreviewed' | 'delete_pending';
  is_pending?: boolean;
  include_metadata?: boolean;
  include_pending?: boolean;
  include_children?: boolean;
  limit?: number;
  offset?: number;
}

export interface InsertTransaction {
  date: string;
  amount: number | string;
  currency?: string;
  payee?: string;
  category_id?: number | null;
  notes?: string | null;
  manual_account_id?: number | null;
  plaid_account_id?: number | null;
  recurring_id?: number | null;
  status?: 'reviewed' | 'unreviewed';
  tag_ids?: number[];
  external_id?: string | null;
  custom_metadata?: Record<string, unknown> | null;
}

export interface CreateTransactionsResponse {
  transactions: Transaction[];
  skipped_duplicates: Transaction[];
}

export interface UpdateTransactionRequest {
  date?: string;
  amount?: number | string;
  currency?: string;
  payee?: string;
  category_id?: number | null;
  notes?: string | null;
  manual_account_id?: number | null;
  plaid_account_id?: number | null;
  recurring_id?: number | null;
  status?: 'reviewed' | 'unreviewed';
  tag_ids?: number[];
  additional_tag_ids?: number[];
  external_id?: string | null;
  custom_metadata?: Record<string, unknown> | null;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

function jsonHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return body.error;
    return response.statusText || `HTTP ${response.status}`;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

async function apiRequest<T>(url: string, init: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, init);
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error,
    );
  }
}

export async function getCategories(apiKey: string): Promise<Category[]> {
  const data = await apiRequest<{ categories: Category[] }>(`${BASE_URL}/categories`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return data.categories;
}

export async function createCategory(
  apiKey: string,
  request: CreateCategoryRequest,
): Promise<Category> {
  return apiRequest<Category>(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(request),
  });
}

export async function getTags(apiKey: string): Promise<Tag[]> {
  const data = await apiRequest<{ tags: Tag[] }>(`${BASE_URL}/tags`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return data.tags;
}

export async function createTag(apiKey: string, name: string): Promise<Tag> {
  return apiRequest<Tag>(`${BASE_URL}/tags`, {
    method: 'POST',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify({ name }),
  });
}

export async function getTransactions(
  apiKey: string,
  params: GetTransactionsParams,
): Promise<Transaction[]> {
  const url = new URL(`${BASE_URL}/transactions`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const data = await apiRequest<{ transactions: Transaction[]; has_more: boolean }>(
    url.toString(),
    { method: 'GET', headers: authHeaders(apiKey) },
  );
  return data.transactions;
}

export async function createTransactions(
  apiKey: string,
  transactions: InsertTransaction[],
): Promise<CreateTransactionsResponse> {
  return apiRequest<CreateTransactionsResponse>(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify({ transactions }),
  });
}

export async function updateTransaction(
  apiKey: string,
  transactionId: number,
  data: UpdateTransactionRequest,
): Promise<Transaction> {
  return apiRequest<Transaction>(`${BASE_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(data),
  });
}
