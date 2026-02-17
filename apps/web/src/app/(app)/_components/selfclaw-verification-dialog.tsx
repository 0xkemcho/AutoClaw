'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useSelfClawStatus,
  useStartVerification,
  usePollVerification,
  selfclawKeys,
} from '@/hooks/use-selfclaw';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SelfClawVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelfClawVerificationDialog({
  open,
  onOpenChange,
}: SelfClawVerificationDialogProps) {
  const queryClient = useQueryClient();
  const { data: status } = useSelfClawStatus();
  const startVerification = useStartVerification();

  const [agentName, setAgentName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [agentNameDisplay, setAgentNameDisplay] = useState<string | null>(null);

  const pollResult = usePollVerification(sessionId);
  const pollData = pollResult.data;

  const resetState = useCallback(() => {
    setSessionId(null);
    setQrCodeUrl(null);
    setAgentNameDisplay(null);
    setAgentName('');
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (pollData?.status === 'verified') {
      queryClient.invalidateQueries({ queryKey: selfclawKeys.status() });
      toast.success('Identity verified! Your agent is now human-backed.');
      onOpenChange(false);
      resetState();
    }
  }, [pollData?.status, queryClient, onOpenChange, resetState]);

  const handleStart = async () => {
    const name = agentName.trim();
    if (!name || name.length < 2) {
      toast.error('Please enter an agent name (2-50 characters)');
      return;
    }
    try {
      const result = await startVerification.mutateAsync(name);
      setSessionId(result.sessionId);
      setQrCodeUrl(result.qrCodeUrl);
      setAgentNameDisplay(result.agentName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start verification';
      toast.error(msg);
    }
  };

  const handleRetry = () => {
    resetState();
  };

  const isVerified = status?.verified ?? false;
  const isExpired = pollData?.status === 'expired';
  const isScanning = !!sessionId && pollData?.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>SelfClaw Identity Verification</DialogTitle>
          <DialogDescription>
            Verify your agent as human-backed using your passport. This proves your agent
            is operated by a verified human.
          </DialogDescription>
        </DialogHeader>

        {isVerified && !sessionId ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              Your agent is verified as human-backed.
              {status?.agentName && (
                <span className="block mt-1 font-medium text-foreground">
                  Agent: {status.agentName}
                </span>
              )}
              {status?.verifiedAt && (
                <span className="block mt-1 text-xs">
                  Verified {new Date(status.verifiedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        ) : isScanning ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg border bg-white p-4">
              <QRCodeSVG value={qrCodeUrl ?? ''} size={200} level="M" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Scan with the Self.xyz app on your phone
              </p>
              <p className="text-xs text-muted-foreground">
                Open the Self app and scan this QR code with your biometric passport.
              </p>
              {agentNameDisplay && (
                <p className="text-xs text-muted-foreground">
                  Agent name: <span className="font-mono">{agentNameDisplay}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Waiting for verification...</span>
            </div>
          </div>
        ) : isExpired ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-sm text-muted-foreground">
              The verification session expired. Please try again.
            </p>
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. my-fx-agent"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. Used for your SelfClaw identity.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleStart}
                disabled={startVerification.isPending || agentName.trim().length < 2}
              >
                {startVerification.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  'Verify as Human-Backed'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
