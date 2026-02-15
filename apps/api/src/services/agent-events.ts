import { EventEmitter } from 'node:events';
import type { ProgressStep, ProgressData } from '@autoclaw/shared';

export type { ProgressStep };

export interface ProgressEvent {
  step: ProgressStep;
  message: string;
  data?: ProgressData;
}

/**
 * Singleton event emitter for agent cycle progress.
 * Events are keyed by `progress:{walletAddress}`.
 */
export const agentEvents = new EventEmitter();
agentEvents.setMaxListeners(50);

export function emitProgress(
  walletAddress: string,
  step: ProgressStep,
  message: string,
  data?: ProgressData,
): void {
  agentEvents.emit(`progress:${walletAddress}`, { step, message, data } satisfies ProgressEvent);
}
