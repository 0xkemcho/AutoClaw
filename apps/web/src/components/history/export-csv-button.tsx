'use client';

import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type TimelineEntry } from '@/hooks/use-agent';

interface ExportCsvButtonProps {
  entries: TimelineEntry[];
}

export function ExportCsvButton({ entries }: ExportCsvButtonProps) {
  const handleExport = useCallback(() => {
    const headers = [
      'Date',
      'Type',
      'Summary',
      'Currency',
      'Amount USD',
      'Direction',
      'Confidence',
      'Tx Hash',
    ];

    const rows = entries.map((entry) => [
      entry.createdAt,
      entry.eventType,
      `"${entry.summary.replace(/"/g, '""')}"`,
      entry.currency ?? '',
      entry.amountUsd != null ? String(entry.amountUsd) : '',
      entry.direction ?? '',
      entry.confidencePct != null ? String(entry.confidencePct) : '',
      entry.txHash ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n',
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `autoclaw-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [entries]);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      disabled={entries.length === 0}
      className="flex items-center gap-2"
    >
      <Download size={16} />
      Export CSV
    </Button>
  );
}
