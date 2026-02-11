/**
 * Unit tests for apps/api/src/services/agent-cron.ts
 *
 * Mocks the @autoclaw/db module so the Supabase client is fully controlled.
 * The key technique is a chainable query-builder mock where each method
 * (.from, .select, .eq, .lte, .gte, .insert, .update) returns `this`,
 * and the final method in the chain resolves to a configurable result.
 */

// ---------------------------------------------------------------------------
// vi.hoisted: variables that are referenced inside vi.mock must be declared
// here so they are available when the mock factory executes (vi.mock is
// hoisted above all imports by Vitest).
// ---------------------------------------------------------------------------
const { mockFrom, setQueryResult, createCapturingProxy } = vi.hoisted(() => {
  /** The result every chain resolves to when awaited */
  let queryResult: { data?: unknown; error?: unknown; count?: number | null } = {
    data: null,
    error: null,
  };

  function setQueryResult(r: typeof queryResult) {
    queryResult = r;
  }

  /**
   * Creates a Proxy where every property access returns the proxy itself
   * (enabling unlimited chaining) and awaiting resolves to `queryResult`.
   */
  function createChainableProxy(): any {
    const handler: ProxyHandler<any> = {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: any) => void) => resolve(queryResult);
        }
        return (..._args: any[]) => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  /**
   * Creates a proxy that captures the argument passed to `insert` while still
   * being fully chainable and thenable.
   */
  function createCapturingProxy(capture: { insertedRow: any }): any {
    const handler: ProxyHandler<any> = {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: any) => void) => resolve({ error: null });
        }
        if (prop === 'insert') {
          return (row: any) => {
            capture.insertedRow = row;
            return new Proxy({}, handler);
          };
        }
        return (..._args: any[]) => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  const mockFrom = {
    fn: null as any, // Will be set below
  };

  // We cannot call vi.fn inside vi.hoisted directly as `vi` is not the same
  // context, so we return a plain object and build the actual vi.fn in the
  // mock factory below. Instead, we return the helpers and a mutable ref.
  // Actually, we CAN use a simple approach: store a reference that the mock
  // factory will close over.

  let fromImpl = (_table: string): any => createChainableProxy();

  const mockFromWrapper = {
    /** Calls recorded for assertions */
    calls: [] as string[],
    /** Current implementation */
    impl: fromImpl,
    /** The function that supabaseAdmin.from points to */
    handler(_table: string): any {
      mockFromWrapper.calls.push(_table);
      return mockFromWrapper.impl(_table);
    },
    /** Reset recorded calls */
    clear() {
      mockFromWrapper.calls = [];
      mockFromWrapper.impl = (_table: string) => createChainableProxy();
    },
    /** Override implementation for one call, then revert */
    mockImplementationOnce(fn: (table: string) => any) {
      const original = mockFromWrapper.impl;
      let called = false;
      mockFromWrapper.impl = (table: string) => {
        if (!called) {
          called = true;
          mockFromWrapper.impl = original;
          return fn(table);
        }
        return original(table);
      };
    },
    /** Override implementation persistently */
    mockImplementation(fn: (table: string) => any) {
      mockFromWrapper.impl = fn;
    },
  };

  return { mockFrom: mockFromWrapper, setQueryResult, createCapturingProxy };
});

vi.mock('@autoclaw/db', () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => mockFrom.handler(table),
  }),
}));

// Mock the Part 2 dependencies that agent-cron now imports
vi.mock('./news-fetcher', () => ({
  fetchFxNews: vi.fn().mockResolvedValue([]),
}));

vi.mock('./llm-analyzer', () => ({
  analyzeFxNews: vi.fn().mockResolvedValue({
    signals: [],
    marketSummary: 'No market data',
    sourcesUsed: 0,
  }),
}));

vi.mock('./trade-executor', () => ({
  executeTrade: vi.fn().mockResolvedValue({
    txHash: '0x123',
    amountIn: 0n,
    amountOut: 0n,
    rate: 1.0,
  }),
}));

vi.mock('./position-tracker', () => ({
  getPositions: vi.fn().mockResolvedValue([]),
  calculatePortfolioValue: vi.fn().mockResolvedValue(0),
  updatePositionAfterTrade: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./rules-engine', () => ({
  checkGuardrails: vi.fn().mockReturnValue({ passed: true }),
  calculateTradeAmount: vi.fn().mockReturnValue(0),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER vi.mock so the mock is in place
// ---------------------------------------------------------------------------
import {
  startAgentCron,
  runAgentCycle,
  logTimeline,
  getTradeCountToday,
} from './agent-cron';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFrom.clear();
  setQueryResult({ data: null, error: null });
});

// ---------------------------------------------------------------------------
// logTimeline
// ---------------------------------------------------------------------------
describe('logTimeline', () => {
  it('inserts a row with all fields correctly mapped', async () => {
    const capture = { insertedRow: null as any };
    mockFrom.mockImplementationOnce(() => createCapturingProxy(capture));

    await logTimeline('0xABC', 'trade', {
      summary: 'Bought CELO',
      detail: { reason: 'bullish' },
      citations: [{ url: 'https://example.com', title: 'Article', excerpt: 'snippet' }],
      confidencePct: 85,
      currency: 'CELO',
      amountUsd: 100,
      direction: 'buy',
      txHash: '0xdeadbeef',
    });

    expect(mockFrom.calls).toContain('agent_timeline');

    expect(capture.insertedRow).toEqual({
      wallet_address: '0xABC',
      event_type: 'trade',
      summary: 'Bought CELO',
      detail: { reason: 'bullish' },
      citations: [{ url: 'https://example.com', title: 'Article', excerpt: 'snippet' }],
      confidence_pct: 85,
      currency: 'CELO',
      amount_usd: 100,
      direction: 'buy',
      tx_hash: '0xdeadbeef',
    });
  });

  it('uses default values for optional fields', async () => {
    const capture = { insertedRow: null as any };
    mockFrom.mockImplementationOnce(() => createCapturingProxy(capture));

    await logTimeline('0x123', 'system', {
      summary: 'Cycle started',
    });

    expect(capture.insertedRow).toEqual({
      wallet_address: '0x123',
      event_type: 'system',
      summary: 'Cycle started',
      detail: {},
      citations: [],
      confidence_pct: null,
      currency: null,
      amount_usd: null,
      direction: null,
      tx_hash: null,
    });
  });

  it('logs error on insert failure but does NOT throw', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setQueryResult({ error: { message: 'insert failed', code: '42P01' } });

    // Should resolve without throwing
    await expect(logTimeline('0x000', 'system', { summary: 'test' })).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to log timeline event:',
      expect.objectContaining({ message: 'insert failed' }),
    );
  });
});

// ---------------------------------------------------------------------------
// getTradeCountToday
// ---------------------------------------------------------------------------
describe('getTradeCountToday', () => {
  it('returns count from query filtered by wallet_address and event_type=trade', async () => {
    setQueryResult({ count: 5, error: null });

    const result = await getTradeCountToday('0xWALLET');

    expect(result).toBe(5);
    expect(mockFrom.calls).toContain('agent_timeline');
  });

  it('returns 0 when count is null', async () => {
    setQueryResult({ count: null, error: null });

    const result = await getTradeCountToday('0xWALLET');
    expect(result).toBe(0);
  });

  it('returns 0 on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setQueryResult({ count: null, error: { message: 'connection refused' } });

    const result = await getTradeCountToday('0xWALLET');

    expect(result).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to count trades today:',
      expect.objectContaining({ message: 'connection refused' }),
    );
  });
});

// ---------------------------------------------------------------------------
// runAgentCycle
// ---------------------------------------------------------------------------
describe('runAgentCycle', () => {
  it('orchestrates full cycle: positions → news → LLM → rules → log', async () => {
    const insertedRows: any[] = [];
    mockFrom.mockImplementation(() => {
      const handler: ProxyHandler<any> = {
        get(_t, prop) {
          if (prop === 'then') {
            return (resolve: (v: any) => void) => resolve({ data: [], error: null, count: 0 });
          }
          if (prop === 'insert') {
            return (row: any) => {
              insertedRows.push(row);
              return new Proxy({}, handler);
            };
          }
          return (..._args: any[]) => new Proxy({}, handler);
        },
      };
      return new Proxy({}, handler);
    });

    const fakeConfig = {
      id: 'cfg-1',
      wallet_address: '0xAGENT',
      turnkey_wallet_address: '0xTURNKEY',
      turnkey_wallet_id: 'tk-1',
      active: true,
      frequency: 'daily' as const,
      max_trade_size_usd: 50,
      max_allocation_pct: 20,
      stop_loss_pct: 10,
      daily_trade_limit: 3,
      allowed_currencies: null,
      blocked_currencies: null,
      custom_prompt: null,
      last_run_at: null,
      next_run_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    await runAgentCycle(fakeConfig);

    expect(mockFrom.calls).toContain('agent_timeline');

    // First insert should be 'system' event: "Agent cycle started"
    expect(insertedRows[0]).toMatchObject({
      wallet_address: '0xAGENT',
      event_type: 'system',
      summary: 'Agent cycle started',
    });

    // Second insert should be 'analysis' event
    expect(insertedRows[1]).toMatchObject({
      wallet_address: '0xAGENT',
      event_type: 'analysis',
    });
  });
});

// ---------------------------------------------------------------------------
// startAgentCron
// ---------------------------------------------------------------------------
describe('startAgentCron', () => {
  it('calls setInterval with 60_000ms', () => {
    const intervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((() => 1) as any);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    setQueryResult({ data: [], error: null });

    startAgentCron();

    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(console.log).toHaveBeenCalledWith('Starting agent cron (tick every 60s)');

    intervalSpy.mockRestore();
  });

  it('runs agentTick immediately on start', () => {
    vi.spyOn(global, 'setInterval').mockImplementation((() => 1) as any);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    setQueryResult({ data: [], error: null });

    startAgentCron();

    // The immediate agentTick call queries supabaseAdmin.from('agent_configs')
    expect(mockFrom.calls).toContain('agent_configs');

    (global.setInterval as any).mockRestore();
  });
});
