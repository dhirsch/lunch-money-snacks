import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ApiError,
  getCategories,
  createCategory,
  getTransactions,
  createTransactions,
  updateTransaction,
  BASE_URL,
} from '../../src/api/lunch-money-client';
import type {
  Category,
  CreateCategoryRequest,
  GetTransactionsParams,
  InsertTransaction,
  UpdateTransactionRequest,
  Transaction,
  CreateTransactionsResponse,
} from '../../src/api/lunch-money-client';

const TEST_API_KEY = 'test-api-key-abc123';

function mockFetchResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => ({} as Response),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

const sampleCategory: Category = {
  id: 315163,
  name: 'Groceries',
  description: null,
  is_income: false,
  exclude_from_budget: false,
  exclude_from_totals: false,
  updated_at: '2024-01-15T10:30:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  group_id: null,
  is_group: false,
  archived: false,
  archived_at: null,
  order: 1,
  collapsed: false,
};

const sampleTransaction: Transaction = {
  id: 123456789,
  date: '2024-12-01',
  amount: '42.89',
  currency: 'usd',
  to_base: 42.89,
  recurring_id: null,
  payee: 'Food Town',
  category_id: 315163,
  notes: null,
  status: 'reviewed',
  is_pending: false,
  created_at: '2024-12-18T04:05:58.072Z',
  updated_at: '2024-12-18T04:05:58.072Z',
  split_parent_id: null,
  is_group_parent: false,
  group_parent_id: null,
  manual_account_id: null,
  plaid_account_id: null,
  tag_ids: [],
  source: 'api',
  external_id: null,
};

describe('ApiError', () => {
  it('creates error with message only', () => {
    const error = new ApiError('Something went wrong');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it('creates error with status code', () => {
    const error = new ApiError('Unauthorized', 401);
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
  });

  it('creates error with cause', () => {
    const cause = new TypeError('fetch failed');
    const error = new ApiError('Network error', undefined, cause);
    expect(error.cause).toBe(cause);
  });

  it('creates error with all properties', () => {
    const cause = new Error('original');
    const error = new ApiError('Server error', 500, cause);
    expect(error.message).toBe('Server error');
    expect(error.statusCode).toBe(500);
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('ApiError');
  });
});

describe('BASE_URL', () => {
  it('is the Lunch Money v2 API URL', () => {
    expect(BASE_URL).toBe('https://api.lunchmoney.dev/v2');
  });
});

describe('Authorization header', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Bearer token in Authorization header', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ categories: [sampleCategory] })
    );

    await getCategories(TEST_API_KEY);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it('sends Content-Type for POST requests', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleCategory, 201)
    );

    await createCategory(TEST_API_KEY, { name: 'Test' });

    const [, init] = mockFetch.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
  });
});

describe('getCategories', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches categories from correct URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ categories: [sampleCategory] })
    );

    const result = await getCategories(TEST_API_KEY);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/categories`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
        }),
      })
    );
    expect(result).toEqual([sampleCategory]);
  });

  it('returns empty array when no categories', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ categories: [] })
    );

    const result = await getCategories(TEST_API_KEY);
    expect(result).toEqual([]);
  });

  it('throws ApiError on 401 unauthorized', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        { error: 'Unauthorized: missing or invalid API key' },
        401,
        'Unauthorized'
      )
    );

    const promise = getCategories(TEST_API_KEY);
    await expect(promise).rejects.toThrow(ApiError);
  });

  it('includes status code on 401 error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Unauthorized' }, 401, 'Unauthorized')
    );

    await expect(getCategories(TEST_API_KEY)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws ApiError on 429 rate limited', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Rate limit exceeded' }, 429, 'Too Many Requests')
    );

    await expect(getCategories(TEST_API_KEY)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('throws ApiError on 500 server error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Internal server error' }, 500, 'Internal Server Error')
    );

    await expect(getCategories(TEST_API_KEY)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('throws ApiError on network failure', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getCategories(TEST_API_KEY)).rejects.toThrow(ApiError);
  });
});

describe('createCategory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a category with correct request', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleCategory, 201)
    );

    const request: CreateCategoryRequest = {
      name: 'Groceries',
      description: 'Food shopping',
      is_income: false,
      exclude_from_budget: false,
      exclude_from_totals: false,
    };

    const result = await createCategory(TEST_API_KEY, request);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/categories`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(request),
      })
    );
    expect(result).toEqual(sampleCategory);
  });

  it('creates a category with minimal fields', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleCategory, 201)
    );

    const result = await createCategory(TEST_API_KEY, { name: 'Budget Notes' });
    expect(result).toEqual(sampleCategory);
  });

  it('throws ApiError on 401', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Unauthorized' }, 401)
    );

    await expect(
      createCategory(TEST_API_KEY, { name: 'Test' })
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on 500', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Server error' }, 500)
    );

    await expect(
      createCategory(TEST_API_KEY, { name: 'Test' })
    ).rejects.toThrow(ApiError);
  });
});

describe('getTransactions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches transactions with date range and category_id', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ transactions: [sampleTransaction], has_more: false })
    );

    const params: GetTransactionsParams = {
      start_date: '2024-12-01',
      end_date: '2024-12-31',
      category_id: 315163,
    };

    const result = await getTransactions(TEST_API_KEY, params);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain(`${BASE_URL}/transactions`);
    expect(calledUrl).toContain('start_date=2024-12-01');
    expect(calledUrl).toContain('end_date=2024-12-31');
    expect(calledUrl).toContain('category_id=315163');
    expect(result).toEqual([sampleTransaction]);
  });

  it('includes include_metadata parameter when set', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ transactions: [], has_more: false })
    );

    await getTransactions(TEST_API_KEY, {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      include_metadata: true,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('include_metadata=true');
  });

  it('includes limit and offset parameters', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ transactions: [], has_more: false })
    );

    await getTransactions(TEST_API_KEY, {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      limit: 500,
      offset: 100,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=500');
    expect(calledUrl).toContain('offset=100');
  });

  it('includes status parameter', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ transactions: [], has_more: false })
    );

    await getTransactions(TEST_API_KEY, {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      status: 'reviewed',
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=reviewed');
  });

  it('returns empty array when no transactions', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ transactions: [], has_more: false })
    );

    const result = await getTransactions(TEST_API_KEY, {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    });
    expect(result).toEqual([]);
  });

  it('throws ApiError on 401', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Unauthorized' }, 401)
    );

    await expect(
      getTransactions(TEST_API_KEY, { start_date: '2024-01-01', end_date: '2024-01-31' })
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on 404', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Not found' }, 404)
    );

    await expect(
      getTransactions(TEST_API_KEY, { start_date: '2024-01-01', end_date: '2024-01-31' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ApiError on 429 rate limited', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Rate limited' }, 429)
    );

    await expect(
      getTransactions(TEST_API_KEY, { start_date: '2024-01-01', end_date: '2024-01-31' })
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on network failure', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      getTransactions(TEST_API_KEY, { start_date: '2024-01-01', end_date: '2024-01-31' })
    ).rejects.toThrow(ApiError);
  });
});

describe('createTransactions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleInsert: InsertTransaction = {
    date: '2024-12-01',
    amount: 42.89,
    payee: 'Food Town',
    category_id: 315163,
    status: 'reviewed',
  };

  const sampleResponse: CreateTransactionsResponse = {
    transactions: [sampleTransaction],
    skipped_duplicates: [],
  };

  it('creates transactions with correct request', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleResponse, 201)
    );

    const result = await createTransactions(TEST_API_KEY, [sampleInsert]);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ transactions: [sampleInsert] }),
      })
    );
    expect(result).toEqual(sampleResponse);
  });

  it('creates transactions with external_id and custom_metadata', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleResponse, 201)
    );

    const txn: InsertTransaction = {
      date: '2024-12-01',
      amount: '19.99',
      payee: 'Test Payee',
      manual_account_id: 219807,
      external_id: 'budget-notes-2024-01',
      custom_metadata: { notes: 'test data', items: [] },
    };

    await createTransactions(TEST_API_KEY, [txn]);

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.transactions[0].external_id).toBe('budget-notes-2024-01');
    expect(body.transactions[0].custom_metadata).toEqual({ notes: 'test data', items: [] });
  });

  it('handles skipped duplicates in response', async () => {
    const mockFetch = vi.mocked(fetch);
    const responseWithDupes: CreateTransactionsResponse = {
      transactions: [],
      skipped_duplicates: [sampleTransaction],
    };
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(responseWithDupes, 201)
    );

    const result = await createTransactions(TEST_API_KEY, [sampleInsert]);
    expect(result.transactions).toEqual([]);
    expect(result.skipped_duplicates).toEqual([sampleTransaction]);
  });

  it('throws ApiError on 401', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Unauthorized' }, 401)
    );

    await expect(
      createTransactions(TEST_API_KEY, [sampleInsert])
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on 500', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Server error' }, 500)
    );

    await expect(
      createTransactions(TEST_API_KEY, [sampleInsert])
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on network failure', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      createTransactions(TEST_API_KEY, [sampleInsert])
    ).rejects.toThrow(ApiError);
  });
});

describe('updateTransaction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates a transaction with correct request', async () => {
    const mockFetch = vi.mocked(fetch);
    const updatedTransaction = { ...sampleTransaction, notes: 'Updated notes' };
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(updatedTransaction, 201)
    );

    const updateData: UpdateTransactionRequest = {
      notes: 'Updated notes',
      category_id: 315163,
    };

    const result = await updateTransaction(TEST_API_KEY, 123456789, updateData);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/transactions/123456789`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(updateData),
      })
    );
    expect(result).toEqual(updatedTransaction);
  });

  it('updates transaction with custom_metadata', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleTransaction, 201)
    );

    const updateData: UpdateTransactionRequest = {
      custom_metadata: { notes: 'budget data', items: [{ desc: 'item1', amount: 10 }] },
    };

    await updateTransaction(TEST_API_KEY, 123456789, updateData);

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.custom_metadata).toEqual(updateData.custom_metadata);
  });

  it('updates transaction with external_id', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(sampleTransaction, 201)
    );

    await updateTransaction(TEST_API_KEY, 123456789, {
      external_id: 'budget-notes-2024-01',
    });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.external_id).toBe('budget-notes-2024-01');
  });

  it('throws ApiError on 401', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Unauthorized' }, 401)
    );

    await expect(
      updateTransaction(TEST_API_KEY, 123456789, { notes: 'test' })
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on 404 not found', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Transaction not found' }, 404)
    );

    await expect(
      updateTransaction(TEST_API_KEY, 999999, { notes: 'test' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ApiError on 429 rate limited', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Rate limited' }, 429)
    );

    await expect(
      updateTransaction(TEST_API_KEY, 123456789, { notes: 'test' })
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('throws ApiError on 500', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: 'Server error' }, 500)
    );

    await expect(
      updateTransaction(TEST_API_KEY, 123456789, { notes: 'test' })
    ).rejects.toThrow(ApiError);
  });

  it('throws ApiError on network failure', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      updateTransaction(TEST_API_KEY, 123456789, { notes: 'test' })
    ).rejects.toThrow(ApiError);
  });
});

describe('Error message extraction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts error message from API error response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(
        { error: 'Unauthorized: missing or invalid API key' },
        401
      )
    );

    try {
      await getCategories(TEST_API_KEY);
      expect.fail('Should have thrown');
    } catch (e) {
      const error = e as ApiError;
      expect(error.message).toContain('Unauthorized');
    }
  });

  it('handles non-JSON error responses gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    const badResponse = {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('not JSON')),
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: '',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve('Bad Gateway'),
    } as Response;
    mockFetch.mockResolvedValueOnce(badResponse);

    try {
      await getCategories(TEST_API_KEY);
      expect.fail('Should have thrown');
    } catch (e) {
      const error = e as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(502);
    }
  });
});
