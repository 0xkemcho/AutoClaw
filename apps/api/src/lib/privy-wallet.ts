import { toAccount } from 'viem/accounts';
import { createWalletClient, http, keccak256, type Account, type Chain, type Hex, type Transport, type WalletClient } from 'viem';
import { serializeTransaction as celoSerializeTransaction } from 'viem/celo';
import type { CeloTransactionSerializable } from 'viem/celo';
import { celo } from 'viem/chains';

export type AgentWalletClient = WalletClient<Transport, Chain, Account>;
import { getPrivyClient } from './privy';

const MAX_WALLET_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Create a new Privy server wallet for an agent user.
 * Retries up to 3 times on failure.
 */
export async function createAgentWallet(userId: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_WALLET_RETRIES; attempt++) {
    try {
      const privy = getPrivyClient();
      const wallet = await privy.wallets().create({
        chain_type: 'ethereum',
      });
      return {
        walletId: wallet.id,
        address: wallet.address,
      };
    } catch (err) {
      lastError = err;
      console.error(`Wallet creation attempt ${attempt}/${MAX_WALLET_RETRIES} failed:`, err);
      if (attempt < MAX_WALLET_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Helpers replicated from Privy SDK viem.mjs (needed for non-CIP-64 path)
// ---------------------------------------------------------------------------

function formatViemTransactionType(type: string | undefined): 0 | 1 | 2 {
  if (type === 'legacy') return 0;
  if (type === 'eip2930') return 1;
  if (type === 'eip1559' || typeof type === 'undefined') return 2;
  throw new Error(`Unsupported transaction type: ${type}`);
}

function formatViemQuantity(input: bigint): string {
  return `0x${input.toString(16)}`;
}

function formatViemTransaction(tx: Record<string, unknown>): Record<string, unknown> {
  return {
    type: formatViemTransactionType(tx.type as string | undefined),
    ...(tx.to ? { to: tx.to } : {}),
    ...(tx.nonce ? { nonce: tx.nonce } : {}),
    ...(tx.chainId ? { chain_id: tx.chainId } : {}),
    ...(tx.data ? { data: tx.data } : {}),
    ...(tx.value ? { value: formatViemQuantity(tx.value as bigint) } : {}),
    ...(tx.gas ? { gas_limit: formatViemQuantity(tx.gas as bigint) } : {}),
    ...(tx.gasPrice ? { gas_price: formatViemQuantity(tx.gasPrice as bigint) } : {}),
    ...(tx.maxFeePerGas ? { max_fee_per_gas: formatViemQuantity(tx.maxFeePerGas as bigint) } : {}),
    ...(tx.maxPriorityFeePerGas
      ? { max_priority_fee_per_gas: formatViemQuantity(tx.maxPriorityFeePerGas as bigint) }
      : {}),
  };
}

function formatViemPersonalSignMessage(message: string | { raw: Hex | Uint8Array }): string | Uint8Array {
  if (typeof message === 'string') return message;
  if (typeof message.raw === 'string') {
    return Uint8Array.from(Buffer.from(message.raw.slice(2), 'hex'));
  }
  return message.raw;
}

function replaceBigInts<T>(obj: T, replacer: (v: bigint) => string): T {
  if (typeof obj === 'bigint') return replacer(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map((x) => replaceBigInts(x, replacer)) as unknown as T;
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, replaceBigInts(v, replacer)]),
    ) as unknown as T;
  }
  return obj;
}

/**
 * Get a viem WalletClient that signs via Privy for the given wallet.
 * Custom implementation that supports Celo CIP-64 feeCurrency transactions.
 *
 * Privy's built-in createViemAccount strips the feeCurrency field and only
 * supports tx types 0/1/2. For CIP-64 (type 0x7b), we manually serialize
 * with viem's Celo serializer, sign the hash via Privy's signSecp256k1,
 * and return the fully-signed serialized tx.
 */
export async function getAgentWalletClient(walletId: string, address: string): Promise<AgentWalletClient> {
  const privy = getPrivyClient();
  const { toHex } = await import('viem/utils');

  const account = toAccount({
    address: address as `0x${string}`,

    sign: async ({ hash }) => {
      const response = await privy.wallets().ethereum().signSecp256k1(walletId, {
        params: { hash },
      });
      return response.signature as Hex;
    },

    signMessage: async ({ message }) => {
      const response = await privy.wallets().ethereum().signMessage(walletId, {
        message: formatViemPersonalSignMessage(message as string | { raw: Hex | Uint8Array }),
      });
      return response.signature as Hex;
    },

    signTypedData: async (typedData) => {
      const replaced = replaceBigInts(typedData, toHex) as Record<string, unknown>;
      const { message, domain, types, primaryType } = replaced;
      if (!domain) throw new Error('typedData.domain must be defined');
      if (!message) throw new Error('typedData.message must be defined');
      if (!types) throw new Error('typedData.types must be defined');
      const { signature } = await privy.wallets().ethereum().signTypedData(walletId, {
        params: {
          typed_data: {
            domain: domain as Record<string, unknown>,
            message: message as Record<string, unknown>,
            primary_type: primaryType as string,
            types: types as Record<string, Array<{ name: string; type: string }>>,
          },
        },
      });
      return signature as Hex;
    },

    signTransaction: async (transaction) => {
      // CIP-64: feeCurrency present → manual serialize + sign hash
      if ('feeCurrency' in transaction && (transaction as Record<string, unknown>).feeCurrency) {
        const celoTx = transaction as unknown as CeloTransactionSerializable;
        const serialized = celoSerializeTransaction(celoTx);
        const hash = keccak256(serialized);

        const { signature: sigHex } = await privy.wallets().ethereum().signSecp256k1(walletId, {
          params: { hash },
        });

        // Parse 65-byte compact signature: r(32) + s(32) + v(1)
        const raw = (sigHex as string).startsWith('0x') ? (sigHex as string).slice(2) : (sigHex as string);
        const r = `0x${raw.slice(0, 64)}` as Hex;
        const s = `0x${raw.slice(64, 128)}` as Hex;
        const v = parseInt(raw.slice(128, 130), 16);
        const yParity = v >= 27 ? v - 27 : v;

        return celoSerializeTransaction(celoTx, { r, s, yParity }) as Hex;
      }

      // Standard EVM path: delegate to Privy's signTransaction
      const { signed_transaction } = await privy.wallets().ethereum().signTransaction(walletId, {
        params: { transaction: formatViemTransaction(transaction as unknown as Record<string, unknown>) },
      });
      return signed_transaction as Hex;
    },
  });

  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}
