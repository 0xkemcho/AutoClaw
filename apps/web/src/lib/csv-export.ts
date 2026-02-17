/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCsv(value: string): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV row from values
 */
function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map((v) => escapeCsv(v != null ? String(v) : '')).join(',');
}

/**
 * Get human-readable action title for an event
 */
function getActionTitle(event: Record<string, unknown>): string {
  const type = event.eventType as string;
  if (type === 'trade') {
    return event.direction === 'buy' ? 'Buy Executed' : 'Sell Executed';
  }
  if (type === 'deposit') return 'Deposit Executed';
  if (type === 'analysis') return 'AI Analysis';
  if (type === 'guardrail') return 'Guardrail Alert';
  return 'System Event';
}

/**
 * Get impact string for an event
 */
function getImpactString(event: Record<string, unknown>): string {
  const type = event.eventType as string;
  if (type === 'trade' || type === 'deposit') {
    const amount = event.amountUsd as number | null | undefined;
    return amount != null ? `+$${Number(amount).toFixed(2)}` : '-';
  }
  if (type === 'analysis') {
    const pct = event.confidencePct as number | null | undefined;
    return pct != null ? `${pct}%` : '-';
  }
  if (type === 'guardrail') return 'High';
  return '-';
}

/**
 * Get status string for an event
 */
function getStatusString(event: Record<string, unknown>): string {
  const type = event.eventType as string;
  if (type === 'trade' || type === 'deposit') return 'Success';
  if (type === 'analysis') return 'Done';
  if (type === 'guardrail') return 'Fixed';
  return 'Logged';
}

/**
 * Export timeline events to CSV and trigger download
 */
export function exportTimelineToCsv(
  events: Record<string, unknown>[],
  filename = 'timeline-export.csv',
): void {
  const headers = [
    'Timestamp',
    'Timestamp (ISO)',
    'Run ID',
    'Action',
    'Event Type',
    'Details',
    'Impact',
    'Status',
    'Currency',
    'Amount (USD)',
    'Direction',
    'Confidence %',
    'TX Hash',
  ];
  const rows = events.map((event) => {
    const createdAt = event.createdAt as string | undefined;
    const date = createdAt ? new Date(createdAt) : null;
    const timestamp =
      date?.toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }) ?? '';
    return csvRow([
      timestamp,
      createdAt ?? '',
      (event.runId as string) ?? '',
      getActionTitle(event),
      (event.eventType as string) ?? '',
      (event.summary as string) ?? (event.title as string) ?? '',
      getImpactString(event),
      getStatusString(event),
      (event.currency as string) ?? '',
      (event.amountUsd as number) ?? '',
      (event.direction as string) ?? '',
      (event.confidencePct as number) ?? '',
      (event.txHash as string) ?? '',
    ]);
  });
  const csv = [csvRow(headers), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
