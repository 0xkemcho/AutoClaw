import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetQuote = vi.hoisted(() => vi.fn());
const mockBuildSwapInTxs = vi.hoisted(() => vi.fn());
const mockApplySlippage = vi.hoisted(() => vi.fn());
const mockCheckAllowance = vi.hoisted(() => vi.fn());
const mockBuildApproveTx = vi.hoisted(() => vi.fn());
const mockSendTransaction = vi.hoisted(() => vi.fn());
const mockWaitForTransactionReceipt = vi.hoisted(() => vi.fn());
const mockGetAgentWalletClient = vi.hoisted(() => vi.fn());

vi.mock('@autoclaw/contracts', () => ({
  getQuote: mockGetQuote,
  buildSwapInTxs: mockBuildSwapInTxs,
  applySlippage: mockApplySlippage,
  checkAllowance: mockCheckAllowance,
  buildApproveTx: mockBuildApproveTx,
  BROKER_ADDRESS: '0xBROKER' as `0x${string}`,
  USDM_ADDRESS: '0xUSDM' as `0x${string}`,
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
}));

vi.mock('../lib/celo-client', () => ({
  celoClient: {
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
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
    mockBuildSwapInTxs.mockReset();
    mockApplySlippage.mockReset();
    mockCheckAllowance.mockReset();
    mockBuildApproveTx.mockReset();
    mockSendTransaction.mockReset();
    mockWaitForTransactionReceipt.mockReset();
    mockGetAgentWalletClient.mockReset();

    // Default mock setup
    mockGetQuote.mockResolvedValue({
      amountOut: 950000000000000000n,
      rate: 0.95,
      route: { exchangeId: '0xEXCHANGE' },
    });
    mockApplySlippage.mockReturnValue(945250000000000000n);
    mockBuildSwapInTxs.mockReturnValue([
      { to: '0xBROKER', data: '0xSWAPDATA' },
    ]);
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
    it('resolves token addresses for buy direction (USDm → currency)', async () => {
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
      expect(callArgs.tokenInDecimals).toBe(18);
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

      expect(mockCheckAllowance).toHaveBeenCalledWith(
        expect.objectContaining({
          token: '0xUSDM',
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

    it('builds swap txs from quote route', async () => {
      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      expect(mockBuildSwapInTxs).toHaveBeenCalledWith(
        expect.objectContaining({
          route: { exchangeId: '0xEXCHANGE' },
          amountOutMin: 945250000000000000n,
        })
      );
    });

    it('sends each hop tx and waits for receipt', async () => {
      mockBuildSwapInTxs.mockReturnValue([
        { to: '0xHOP1', data: '0xDATA1' },
        { to: '0xHOP2', data: '0xDATA2' },
      ]);

      await executeTrade({
        serverWalletId: 'mock-wallet-id',
        serverWalletAddress: MOCK_WALLET_ADDRESS,
        currency: 'EURm',
        direction: 'buy',
        amountUsd: 100,
      });

      // approve + 2 hops = 3 total
      expect(mockSendTransaction).toHaveBeenCalledTimes(3);
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledTimes(3);
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
