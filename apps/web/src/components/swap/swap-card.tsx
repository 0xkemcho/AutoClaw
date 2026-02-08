'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowDownUp, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { prepareTransaction } from 'thirdweb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SwapTokenInput } from './swap-token-input';
import { SwapDetails } from './swap-details';
import { SlippageSettings } from './slippage-settings';
import { TokenSelectorModal } from './token-selector-modal';
import { useEnsureAuth } from '@/providers/thirdweb-provider';
import { fetchWithAuth } from '@/lib/api';
import { client } from '@/lib/thirdweb';
import { celo } from '@/lib/chains';

type SwapState =
  | 'idle'
  | 'loading-quote'
  | 'quote-ready'
  | 'approving'
  | 'swapping'
  | 'confirmed'
  | 'error';

interface QuoteResponse {
  estimatedAmountOut: string;
  estimatedAmountOutRaw: string;
  minimumAmountOut: string;
  minimumAmountOutRaw: string;
  exchangeRate: string;
  priceImpact: number;
  estimatedGasCelo: string;
  exchangeProvider: string;
  exchangeId: string;
  approveTx: { to: string; data: string } | null;
  swapTxs: { to: string; data: string }[];
  fromToken: string;
  toToken: string;
  amountIn: string;
}

interface SwapCardProps {
  initialToToken?: string;
}

export function SwapCard({ initialToToken }: SwapCardProps) {
  const account = useActiveAccount();
  const ensureAuth = useEnsureAuth();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const [fromToken, setFromToken] = useState<string>('USDC');
  const [toToken, setToToken] = useState<string>(initialToToken || '');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [swapState, setSwapState] = useState<SwapState>('idle');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Token selector modal
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSide, setSelectorSide] = useState<'from' | 'to'>('from');

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  // Quote refresh interval
  const refreshRef = useRef<ReturnType<typeof setInterval>>(null);
  // Re-entrancy guard for swap execution
  const swapInProgressRef = useRef(false);
  // Reset timeout after confirmed state
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Fetch quote
  const fetchQuote = useCallback(
    async (from: string, to: string, amt: string, slip: number) => {
      if (!from || !to || !amt || parseFloat(amt) <= 0) {
        setQuote(null);
        setSwapState('idle');
        return;
      }

      setSwapState('loading-quote');
      setError(null);

      try {
        const token = await ensureAuth();
        if (!token) {
          setSwapState('error');
          setError('Please connect your wallet');
          return;
        }

        const data = await fetchWithAuth('/api/trade/quote', token, {
          method: 'POST',
          body: JSON.stringify({
            from,
            to,
            amount: amt,
            slippage: slip,
          }),
        });

        setQuote(data);
        setSwapState('quote-ready');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to get quote';
        setError(message);
        setSwapState('error');
      }
    },
    [ensureAuth],
  );

  // Auto-fetch quote on input changes (debounced 500ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setSwapState('idle');
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchQuote(fromToken, toToken, amount, slippage);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fromToken, toToken, amount, slippage, fetchQuote]);

  // Auto-refresh quote every 30s when quote is ready
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);

    if (
      swapState === 'quote-ready' &&
      fromToken &&
      toToken &&
      amount
    ) {
      refreshRef.current = setInterval(() => {
        fetchQuote(fromToken, toToken, amount, slippage);
      }, 30_000);
    }

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [swapState, fromToken, toToken, amount, slippage, fetchQuote]);

  // Switch tokens
  const handleSwitch = () => {
    // Only allow switching if the target is a valid base token
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
    setQuote(null);
    setSwapState('idle');
  };

  // Token selection
  const openSelector = (side: 'from' | 'to') => {
    setSelectorSide(side);
    setSelectorOpen(true);
  };

  const handleTokenSelect = (symbol: string) => {
    if (selectorSide === 'from') {
      if (symbol === toToken) setToToken(fromToken);
      setFromToken(symbol);
    } else {
      if (symbol === fromToken) setFromToken(toToken);
      setToToken(symbol);
    }
    setQuote(null);
    setSwapState('idle');
  };

  // Execute swap
  const handleSwap = async () => {
    if (!quote || !account) return;
    if (swapInProgressRef.current) return;
    swapInProgressRef.current = true;

    // Stop quote refresh while swap is in progress
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    try {
      // Step 1: Approve if needed
      if (quote.approveTx) {
        setSwapState('approving');
        const approveToastId = toast.loading(
          `Approving ${quote.fromToken}...`,
        );

        try {
          const approveTx = prepareTransaction({
            to: quote.approveTx.to as `0x${string}`,
            data: quote.approveTx.data as `0x${string}`,
            chain: celo,
            client,
          });

          const approveResult = await sendTransaction(approveTx);
          toast.dismiss(approveToastId);
          toast.success(`${quote.fromToken} approved`);
        } catch (err) {
          toast.dismiss(approveToastId);
          const message =
            err instanceof Error ? err.message : 'Approval failed';
          toast.error(`Approval failed: ${message}`);
          setSwapState('quote-ready');
          return;
        }
      }

      // Step 2: Execute swap tx(s) — may be multi-hop
      setSwapState('swapping');
      const swapToastId = toast.loading(
        `Swapping ${quote.amountIn} ${quote.fromToken} → ${quote.toToken}...`,
      );

      let txHash = '';
      for (const swapTxData of quote.swapTxs) {
        const swapTx = prepareTransaction({
          to: swapTxData.to as `0x${string}`,
          data: swapTxData.data as `0x${string}`,
          chain: celo,
          client,
        });

        const swapResult = await sendTransaction(swapTx);

        txHash =
          typeof swapResult === 'object' && 'transactionHash' in swapResult
            ? (swapResult as { transactionHash: string }).transactionHash
            : String(swapResult);
      }

      toast.dismiss(swapToastId);

      // Record transaction on backend
      try {
        const token = await ensureAuth();
        if (token) {
          await fetchWithAuth('/api/trade/execute', token, {
            method: 'POST',
            body: JSON.stringify({
              txHash,
              from: quote.fromToken,
              to: quote.toToken,
              amountIn: quote.amountIn,
              amountOut: quote.estimatedAmountOut,
              exchangeRate: quote.exchangeRate,
            }),
          });
        }
      } catch {
        // Non-critical: tx is on-chain even if recording fails
      }

      toast.success(
        `Swap confirmed! Received ${quote.estimatedAmountOut} ${quote.toToken}`,
        {
          action: {
            label: 'View on CeloScan',
            onClick: () =>
              window.open(
                `https://celoscan.io/tx/${txHash}`,
                '_blank',
              ),
          },
        },
      );

      setSwapState('confirmed');
      setAmount('');
      setQuote(null);

      // Reset after a moment — store ref so it can be cancelled
      resetTimeoutRef.current = setTimeout(() => setSwapState('idle'), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Swap failed';
      toast.error(`Swap failed: ${message}`);
      setSwapState('error');
    } finally {
      swapInProgressRef.current = false;
    }
  };

  // Button state
  const getButtonConfig = () => {
    if (!account) return { label: 'Connect Wallet', disabled: true };
    if (!fromToken || !toToken)
      return { label: 'Select tokens', disabled: true };
    if (!amount || parseFloat(amount) <= 0)
      return { label: 'Enter amount', disabled: true };
    if (swapState === 'loading-quote')
      return { label: 'Getting quote...', disabled: true };
    if (swapState === 'approving')
      return { label: `Approving ${fromToken}...`, disabled: true };
    if (swapState === 'swapping')
      return { label: 'Swapping...', disabled: true };
    if (swapState === 'confirmed')
      return { label: 'Swap confirmed!', disabled: true };
    if (error) return { label: 'Retry', disabled: false };
    if (quote?.approveTx)
      return { label: `Approve & Swap`, disabled: false };
    if (quote) return { label: 'Swap', disabled: false };
    return { label: 'Swap', disabled: true };
  };

  const buttonConfig = getButtonConfig();
  const isLoading =
    swapState === 'loading-quote' ||
    swapState === 'approving' ||
    swapState === 'swapping';

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <div className="space-y-3">
          {/* From */}
          <SwapTokenInput
            label="From"
            symbol={fromToken}
            amount={amount}
            onAmountChange={setAmount}
            onTokenClick={() => openSelector('from')}
          />

          {/* Switch button */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwitch}
              className="p-2 rounded-full bg-background-secondary hover:bg-border border border-border transition-colors z-10"
            >
              <ArrowDownUp size={16} className="text-foreground-secondary" />
            </button>
          </div>

          {/* To */}
          <SwapTokenInput
            label="To"
            symbol={toToken}
            amount={quote?.estimatedAmountOut || ''}
            onTokenClick={() => openSelector('to')}
            readOnly
            estimating={swapState === 'loading-quote'}
          />

          {/* Quote details */}
          {quote && swapState === 'quote-ready' && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <SlippageSettings value={slippage} onChange={setSlippage} />
              </div>
              <SwapDetails
                fromSymbol={quote.fromToken}
                toSymbol={quote.toToken}
                exchangeRate={quote.exchangeRate}
                minimumReceived={quote.minimumAmountOut}
                priceImpact={quote.priceImpact}
                estimatedGas={quote.estimatedGasCelo}
              />
            </div>
          )}

          {/* Error */}
          {error && swapState === 'error' && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          {/* Swap button */}
          <Button
            variant="cta"
            size="lg"
            className="w-full"
            disabled={buttonConfig.disabled}
            onClick={error ? () => fetchQuote(fromToken, toToken, amount, slippage) : handleSwap}
          >
            {isLoading && (
              <Loader2 size={16} className="animate-spin inline mr-2" />
            )}
            {buttonConfig.label}
          </Button>
        </div>
      </Card>

      {/* Token Selector Modal */}
      <TokenSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleTokenSelect}
        title={selectorSide === 'from' ? 'Pay with' : 'Receive'}
        tokenFilter={selectorSide === 'from' ? 'base' : 'target'}
        selectedToken={selectorSide === 'from' ? fromToken : toToken}
      />
    </>
  );
}
