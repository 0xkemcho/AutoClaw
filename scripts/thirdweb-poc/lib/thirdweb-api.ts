/**
 * Thirdweb API client for server wallets and transactions.
 * Uses REST API: https://api.thirdweb.com
 */
const THIRDWEB_API_BASE = 'https://api.thirdweb.com';

function getSecretKey(): string {
  const key = process.env.THIRDWEB_SECRET_KEY;
  if (!key) {
    throw new Error(
      'THIRDWEB_SECRET_KEY is required. Set it in apps/api/.env or .env',
    );
  }
  return key;
}

export interface CreateServerWalletResult {
  address: string;
  createdAt?: string;
}

/**
 * Create a new server wallet via thirdweb API.
 * POST /v1/wallets/server
 */
export async function createServerWallet(
  identifier: string,
): Promise<CreateServerWalletResult> {
  const res = await fetch(`${THIRDWEB_API_BASE}/v1/wallets/server`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-secret-key': getSecretKey(),
    },
    body: JSON.stringify({ identifier }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `thirdweb createServerWallet failed (${res.status}): ${text}`,
    );
  }

  const json = (await res.json()) as { result?: { address?: string; createdAt?: string } };
  const address = json.result?.address ?? json.address;
  if (!address || typeof address !== 'string') {
    throw new Error(`thirdweb createServerWallet: no address in response: ${JSON.stringify(json)}`);
  }

  return {
    address,
    createdAt: json.result?.createdAt,
  };
}

export interface TransactionInput {
  to: string;
  data: string;
  value?: string;
}

export interface SendTransactionParams {
  chainId: number;
  from: string;
  transactions: TransactionInput[];
}

export interface SendTransactionResult {
  transactionIds: string[];
}

/**
 * Send raw transaction(s) from a server wallet.
 * Gas is sponsored by default (EIP-7702) when using thirdweb API.
 * POST /v1/transactions
 */
export async function sendTransaction(
  params: SendTransactionParams,
): Promise<SendTransactionResult> {
  const { chainId, from, transactions } = params;

  const body = {
    chainId,
    from,
    transactions: transactions.map((tx) => ({
      to: tx.to,
      data: tx.data,
      value: tx.value ?? '0',
    })),
  };

  const res = await fetch(`${THIRDWEB_API_BASE}/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-secret-key': getSecretKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`thirdweb sendTransaction failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { result?: { transactionIds?: string[] }; transactionIds?: string[] };
  const ids = json.result?.transactionIds ?? json.transactionIds ?? [];
  return { transactionIds: Array.isArray(ids) ? ids : [String(ids)] };
}
