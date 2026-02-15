import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Button asChild variant="outline" className="gap-2 mt-2">
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
