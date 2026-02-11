import { PrivyClient } from '@privy-io/node';

let _privy: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!_privy) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      console.warn('Privy credentials not set — wallet operations disabled');
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET required');
    }
    _privy = new PrivyClient({ appId, appSecret });
  }
  return _privy;
}
