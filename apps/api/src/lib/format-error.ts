/**
 * Format execution errors for display in timeline
 * Cleans up viem errors and extracts human-readable messages
 */
export function formatExecutionError(error: unknown): string {
  if (!error) return 'Unknown error occurred';

  const errorStr = error instanceof Error ? error.message : String(error);

  // Extract human-readable message from common viem errors
  if (errorStr.includes('insufficient funds')) {
    return 'Insufficient funds in wallet to execute transaction';
  }

  if (errorStr.includes('exceeds the balance')) {
    return 'Transaction cost exceeds wallet balance';
  }

  if (errorStr.includes('gas required exceeds')) {
    return 'Gas cost too high for available balance';
  }

  if (errorStr.includes('nonce too low')) {
    return 'Transaction nonce error - please retry';
  }

  if (errorStr.includes('reverted')) {
    // Try to extract revert reason
    const revertMatch = errorStr.match(/reverted with reason string ['"]([^'"]+)['"]/);
    if (revertMatch) {
      return `Transaction reverted: ${revertMatch[1]}`;
    }
    return 'Transaction reverted by contract';
  }

  if (errorStr.includes('user rejected') || errorStr.includes('user denied')) {
    return 'Transaction cancelled by user';
  }

  if (errorStr.includes('network') || errorStr.includes('timeout')) {
    return 'Network error - please check connection and retry';
  }

  // For other errors, take first line and truncate
  const firstLine = errorStr.split('\n')[0];
  if (firstLine.length > 200) {
    return firstLine.slice(0, 197) + '...';
  }

  return firstLine;
}
