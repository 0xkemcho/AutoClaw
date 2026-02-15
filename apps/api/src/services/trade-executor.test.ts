import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetQuote = vi.hoisted(() => vi.fn());
const mockApplySlippage = vi.hoisted(() => vi.fn());
const mockCheckAllowance = vi.hoisted(() => vi.fn());
const mockBuildApproveTx = vi.hoisted(() => vi.fn());
const mockSendTransaction = vi.hoisted(() => vi.fn());
const mockWaitForTransactionReceipt = vi.hoisted(() => vi.fn());
const mockReadContract = vi.hoisted(() => vi.fn());
const mockGetAgentWalletClient = vi.hoisted(() => vi.fn());
const mockEncodeFunctionData = vi.hoisted(() => vi.fn());

vi.mock('viem', async (importOriginal) => {
  const orig = await importOriginal<typeof import('viem')>();
  return {
    ...orig,
    encodeFunctionData: mockEncodeFunctionData,
  };
});

vi.mock('@autoclaw/contracts', () => ({
  getQuote: mockGetQuote,
  applySlippage: mockApplySlippage,
  checkAllowance: mockCheckAllowance,
  buildApproveTx: mockBuildApproveTx,
  BROKER_ADDRESS: '0xBROKER' as `0x${string}`,
  BIPOOL_MANAGER_ADDRESS: '0xBIPOOL' as `0x${string}`,
  USDM_ADDRESS: '0xUSDM' as `0x${string}`,
  USDC_FEE_ADAPTER: '0xUSDC_FEE_ADAPTER' as `0x${string}`,
  USDT_FEE_ADAPTER: '0xUSDT_FEE_ADAPTER' as `0x${string}`,
  brokerAbi: [],
}));

vi.mock('@autoclaw/shared', () => ({
  getTokenAddress: vi.fn().mockImplementation((symbol: string) => {
    const addresses: Record<string, string> = {
      EURm: '0xEURm',
      GBPm: '0xGBPm',
    };
    return addresses[symbol] || null;
  }),
  getTokenDecimals: vi.fn().mockReturnValue(18),
  USDC_CELO_ADDRESS: '0xUSDC',
  USDT_CELO_ADDRESS: '0xUSDT',
}));

vi.mock('../lib/celo-client', () => ({
  celoClient: {
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    readContract: mockReadContract,
  },
}));

vi.mock('../lib/privy-wallet', () => ({
  getAgentWalletClient: mockGetAgentWalletClient,
}));

import { executeTrade, clearApprovalCache } from './trade-executor';

const MOCK_WALLET_ADDRESS = '0xWALLET123';

describe('trade-executor', () => {
  beforeEach(() => {
    clearApprovalCache();
    mockGetQuote.mockReset();
    mockApplySlippage.mockReset();
    mockCheckAllowance.mockReset();
    mockBuildApproveTx.mockReset();
    mockSendTransaction.mockReset();
    mockWaitForTransactionReceipt.mockReset();
    mockReadContract.mockReset();
    mockGetAgentWalletClient.mockReset();
    mockEncodeFunctionData.mockReset();

    // Default mock setup — readContract returns large balance so pre-flight check passes
    mockReadContract.mockResolvedValue(BigInt('999999999999999999999999'));
    mockGetQuote.mockResolvedValue({
      amountOut: 950000000000000000n,
      rate: 0.95,
      route: [{ exchangeId: '0xEXCHANGE', tokenIn: '0xUSDC', tokenOut: '0xEURm' }],
    });
    mockApplySlippage.mockReturnValue(945250000000000000n);
    mockEncodeFunctionData.mockReturnValue('0xSWAPDATA');
    mockCheckAllowance.mockResolvedValue(0n);
    mockBuildApproveTx.mockReturnValue({ to: '0xUSDM', data: '0xAPPROVEDATA' });
    mockSendTransaction.mockResolvedValue('0xTXHASH123');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });
    mockGetAgentWalletClient.mockResolvedValue({
      sendTransaction: mockSendTransaction,
      chain: { id: 42220 },
    });
  });

  describe('executeTrade', () => {
    it('resolves token addresses for buy direction (picks first base token with balance)', async () => {
      // Default mock returns large balance, so USDC (first in priority) is picked
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockGetQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenIn: '0xUSDC',
          tokenOut: '0xEURm',
        })
      );
    });

    it('falls back to next base token when first has no balance', async () => {
      // USDC returns 0, USDT returns 0, USDm has enough — use address-based mocking
      mockReadContract.mockImplementation(async (args: Record<string, unknown>) => {
        const address = args.address as string;
        // USDC and USDT return 0 balance
        if (address === '0xUSDC' || address === '0xUSDT') return 0n;
        // USDm and everything else returns large balance
        return BigInt('999999999999999999999999');
      });

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockGetQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenIn: '0xUSDM',
          tokenOut: '0xEURm',
        })
      );
    });

    it('resolves token addresses for sell direction (currency → USDm)', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'sell',
        amountUsd: 100,
      });

      expect(mockGetQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenIn: '0xEURm',
          tokenOut: '0xUSDM',
        })
      );
    });

    it('gets quote with correct params', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 50,
      });

      expect(mockGetQuote).toHaveBeenCalledTimes(1);
      const callArgs = mockGetQuote.mock.calls[0][0];
      // USDC is picked first (6 decimals), target EURm has 18 decimals
      expect(callArgs.tokenInDecimals).toBe(6);
      expect(callArgs.tokenOutDecimals).toBe(18);
    });

    it('applies 0.5% slippage', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockApplySlippage).toHaveBeenCalledWith(950000000000000000n, 0.5);
    });

    it('checks allowance before first trade', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      // USDC is picked as source (first with balance)
      expect(mockCheckAllowance).toHaveBeenCalledWith(
        expect.objectContaining({
          token: '0xUSDC',
          owner: MOCK_WALLET_ADDRESS,
          spender: '0xBROKER',
        })
      );
    });

    it('sends approve tx when allowance is insufficient', async () => {
      mockCheckAllowance.mockResolvedValue(0n);

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockBuildApproveTx).toHaveBeenCalled();
      // Approve tx + swap tx = 2 sendTransaction calls
      expect(mockSendTransaction).toHaveBeenCalledTimes(2);
    });

    it('skips approve when allowance is sufficient', async () => {
      mockCheckAllowance.mockResolvedValue(BigInt('999999999999999999999'));

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockBuildApproveTx).not.toHaveBeenCalled();
      // Only swap tx = 1 sendTransaction call
      expect(mockSendTransaction).toHaveBeenCalledTimes(1);
    });

    it('skips allowance check on second trade (cached)', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      mockCheckAllowance.mockClear();

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 50,
      });

      expect(mockCheckAllowance).not.toHaveBeenCalled();
    });

    it('encodes swap tx with correct broker and route params', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockEncodeFunctionData).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'swapIn',
        })
      );
    });

    it('executes multi-hop swap sequentially, reading intermediate balance', async () => {
      // Route: USDC → USDm → EURm (2 hops)
      mockGetQuote.mockResolvedValue({
        amountOut: 950000000000000000n,
        rate: 0.95,
        route: [
          { exchangeId: '0xEX1', tokenIn: '0xUSDC', tokenOut: '0xUSDM' },
          { exchangeId: '0xEX2', tokenIn: '0xUSDM', tokenOut: '0xEURm' },
        ],
      });
      // Allowance must be >= intermediate balance to skip approval
      mockCheckAllowance.mockResolvedValue(BigInt('999999999999999999999999'));

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      // 2 swap txs (no approval needed since allowance >= balance)
      expect(mockSendTransaction).toHaveBeenCalledTimes(2);
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledTimes(2);
      // encodeFunctionData called twice (once per hop)
      expect(mockEncodeFunctionData).toHaveBeenCalledTimes(2);
    });

    it('returns txHash, amountIn, amountOut, rate', async () => {
      const result = await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(result.txHash).toBe('0xTXHASH123');
      expect(result.amountIn).toBeDefined();
      expect(result.amountOut).toBe(950000000000000000n);
      expect(result.rate).toBe(0.95);
    });

    it('throws on unknown currency', async () => {
      await expect(
        executeTrade({
          serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
          currency: 'INVALID',
          direction: 'buy',
          amountUsd: 100,
        })
      ).rejects.toThrow('Unknown token address');
    });

    it('passes feeCurrency to all sendTransaction calls', async () => {
      mockCheckAllowance.mockResolvedValue(0n); // Force approval tx

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      // Both approval and swap sendTransaction calls should include feeCurrency
      for (const call of mockSendTransaction.mock.calls) {
        expect(call[0]).toHaveProperty('feeCurrency');
      }
    });

    it('uses USDC fee adapter when wallet holds USDC', async () => {
      // Default mock returns large balance for all — USDC is first in priority
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      // The swap sendTransaction should use USDC fee adapter
      const lastCall = mockSendTransaction.mock.calls[mockSendTransaction.mock.calls.length - 1][0];
      expect(lastCall.feeCurrency).toBe('0xUSDC_FEE_ADAPTER');
    });

    it('uses USDm address as feeCurrency when only USDm has balance', async () => {
      mockReadContract.mockImplementation(async (args: Record<string, unknown>) => {
        const address = args.address as string;
        if (address === '0xUSDC' || address === '0xUSDT') return 0n;
        return BigInt('999999999999999999999999');
      });

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      const lastCall = mockSendTransaction.mock.calls[mockSendTransaction.mock.calls.length - 1][0];
      expect(lastCall.feeCurrency).toBe('0xUSDM');
    });

    it('translates "insufficient funds" error to actionable message', async () => {
      mockCheckAllowance.mockResolvedValue(BigInt('999999999999999999999'));
      mockSendTransaction.mockRejectedValueOnce(
        new Error('insufficient funds for transfer'),
      );

      await expect(
        executeTrade({
          serverWalletId: 'mock-wallet-id',
          serverWalletAddress: MOCK_WALLET_ADDRESS,
          currency: 'EURm',
          direction: 'buy',
          amountUsd: 100,
        }),
      ).rejects.toThrow(/insufficient funds for gas fees/);
    });

    it('translates "execution reverted" error to actionable message', async () => {
      mockCheckAllowance.mockResolvedValue(BigInt('999999999999999999999'));
      mockSendTransaction.mockRejectedValueOnce(
        new Error('execution reverted'),
      );

      await expect(
        executeTrade({
          serverWalletId: 'mock-wallet-id',
          serverWalletAddress: MOCK_WALLET_ADDRESS,
          currency: 'EURm',
          direction: 'buy',
          amountUsd: 100,
        }),
      ).rejects.toThrow(/slippage exceeded/);
    });
  });

  describe('clearApprovalCache', () => {
    it('resets tracked approvals', async () => {
      // First trade caches the approval
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      clearApprovalCache();
      mockCheckAllowance.mockClear();

      // After clearing cache, should check allowance again
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 50,
      });

      expect(mockCheckAllowance).toHaveBeenCalled();
    });
  });
});
