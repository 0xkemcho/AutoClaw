'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TokenLogo } from '@/components/token-logo';
import { api } from '@/lib/api-client';
import { portfolioKeys } from '@/hooks/use-portfolio';
import { toast } from 'sonner';

interface SendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: Array<{ tokenSymbol: string; balance: number }>;
  agentType?: 'fx' | 'yield';
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function SendModal({ open, onOpenChange, holdings, agentType = 'fx' }: SendModalProps) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  // Real-time on-chain balance (avoids stale Dune/portfolio data)
  const { data: balanceData } = useQuery({
    queryKey: ['trade', 'balance', token, agentType],
    queryFn: () =>
      api.get<{ balance: number }>(
        `/api/trade/balance?token=${encodeURIComponent(token)}&agent_type=${agentType}`,
      ),
    enabled: open && !!token,
  });

  const onChainBalance = balanceData?.balance ?? null;
  const effectiveBalance =
    onChainBalance !== null ? onChainBalance : holdings.find((h) => h.tokenSymbol === token)?.balance ?? 0;

  // Reset form when modal opens
  const resetForm = useCallback(() => {
    setToken('');
    setAmount('');
    setRecipient('');
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const selectedHolding = holdings.find((h) => h.tokenSymbol === token);
  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    token !== '' &&
    parsedAmount <= effectiveBalance;
  const isValidAddress = ADDRESS_REGEX.test(recipient);
  const canSubmit = isValidAmount && isValidAddress && token !== '';

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post('/api/trade/send', {
        token,
        amount: parsedAmount,
        recipient,
        agent_type: agentType,
      }),
    onSuccess: () => {
      toast.success('Transaction sent successfully');
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send transaction');
    },
  });

  function handleAmountChange(value: string) {
    // Allow empty string, or valid decimal number input
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }

  function handleMax() {
    if (token && effectiveBalance >= 0) {
      setAmount(String(effectiveBalance));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    sendMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Tokens</DialogTitle>
          <DialogDescription>
            Transfer tokens from your agent wallet on Celo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Token selector */}
          <div className="space-y-2">
            <Label htmlFor="send-token">Token</Label>
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger id="send-token" className="w-full">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {holdings.map((h) => {
                  const displayBalance =
                    token === h.tokenSymbol && onChainBalance !== null
                      ? onChainBalance
                      : h.balance;
                  return (
                    <SelectItem key={h.tokenSymbol} value={h.tokenSymbol}>
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={h.tokenSymbol} size={16} />
                        <span>{h.tokenSymbol}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {displayBalance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="send-amount">Amount</Label>
            <div className="relative">
              <Input
                id="send-amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pr-16 font-mono"
                inputMode="decimal"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                onClick={handleMax}
                disabled={!token || effectiveBalance <= 0}
              >
                MAX
              </Button>
            </div>
            {amount !== '' && !isNaN(parsedAmount) && token && parsedAmount > effectiveBalance && (
              <p className="text-xs text-destructive">
                Exceeds available balance of{' '}
                {effectiveBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {token}
              </p>
            )}
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="send-recipient">Recipient Address</Label>
            <Input
              id="send-recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className="font-mono text-sm"
              autoComplete="off"
            />
            {recipient !== '' && !isValidAddress && (
              <p className="text-xs text-destructive">
                Enter a valid Ethereum address (0x...)
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!canSubmit || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
