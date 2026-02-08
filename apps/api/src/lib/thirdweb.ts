import { createThirdwebClient } from 'thirdweb';
import { createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';

const secretKey = process.env.THIRDWEB_SECRET_KEY;
const adminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const authDomain = process.env.AUTH_DOMAIN;

if (!secretKey) throw new Error('THIRDWEB_SECRET_KEY is required');
if (!adminPrivateKey) throw new Error('THIRDWEB_ADMIN_PRIVATE_KEY is required');
if (!authDomain) throw new Error('AUTH_DOMAIN is required');

export const thirdwebClient = createThirdwebClient({ secretKey });

const adminAccount = privateKeyToAccount({
  client: thirdwebClient,
  privateKey: adminPrivateKey as `0x${string}`,
});

export const thirdwebAuth: ReturnType<typeof createAuth> = createAuth({
  domain: authDomain,
  client: thirdwebClient,
  adminAccount,
});
