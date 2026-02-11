import { TurnkeyClient } from '@turnkey/http';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';

const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;

if (!apiPublicKey || !apiPrivateKey) {
  console.warn(
    'TURNKEY_API_PUBLIC_KEY or TURNKEY_API_PRIVATE_KEY not set — Turnkey wallet features disabled',
  );
}

export const turnkeyClient = new TurnkeyClient(
  { baseUrl: 'https://api.turnkey.com' },
  new ApiKeyStamper({
    apiPublicKey: apiPublicKey || '',
    apiPrivateKey: apiPrivateKey || '',
  }),
);

export const TURNKEY_ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID || '';
