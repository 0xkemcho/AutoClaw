'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/format';
import { toast } from 'sonner';

interface ReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}

export function ReceiveModal({
  open,
  onOpenChange,
  walletAddress,
}: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(walletAddress);
    toast.success('Address copied to clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Funds</DialogTitle>
          <DialogDescription>
            Send tokens to your agent wallet on the Celo network.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code with white background for readability on dark theme */}
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG
              value={walletAddress}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Full address */}
          <code className="max-w-full break-all rounded-lg border bg-muted/50 px-3 py-2 text-center font-mono text-xs">
            {walletAddress}
          </code>

          {/* Copy button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="size-4 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Address
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
