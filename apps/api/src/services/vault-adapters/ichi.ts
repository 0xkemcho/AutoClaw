import { type Address, type PublicClient, encodeFunctionData, erc20Abi } from 'viem';
import { ichiVaultAbi } from '@autoclaw/contracts';
import type { VaultAdapter, VaultInfo, VaultPosition, DepositParams, WithdrawParams, TxResult } from './types';

const HYSTERESIS_MAX_RETRIES = 3;
const HYSTERESIS_RETRY_DELAY_MS = 10_000;

export class IchiVaultAdapter implements VaultAdapter {
  protocol = 'ichi' as const;

  async getVaultInfo(address: Address, client: PublicClient): Promise<VaultInfo> {
    const [token0, token1, allowToken0, allowToken1, totalSupply, totalAmounts, deposit0Max, deposit1Max] =
      await Promise.all([
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'token0' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'token1' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'allowToken0' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'allowToken1' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'totalSupply' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'getTotalAmounts' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'deposit0Max' }),
        client.readContract({ address, abi: ichiVaultAbi, functionName: 'deposit1Max' }),
      ]);

    return {
      address,
      token0: token0 as Address,
      token1: token1 as Address,
      allowToken0: allowToken0 as boolean,
      allowToken1: allowToken1 as boolean,
      totalSupply: totalSupply as bigint,
      totalAmounts: totalAmounts as [bigint, bigint],
      deposit0Max: deposit0Max as bigint,
      deposit1Max: deposit1Max as bigint,
    };
  }

  async deposit(params: DepositParams): Promise<TxResult> {
    const { vaultAddress, amount, depositor, walletClient, publicClient } = params;

    // Check and set approval for the vault
    const allowance = await publicClient.readContract({
      address: await this.getDepositTokenAddress(vaultAddress, publicClient),
      abi: erc20Abi,
      functionName: 'allowance',
      args: [depositor, vaultAddress],
    });

    if ((allowance as bigint) < amount) {
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      });

      const approveHash = await walletClient.sendTransaction({
        to: await this.getDepositTokenAddress(vaultAddress, publicClient),
        data: approveData,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // Deposit with retry for hysteresis
    for (let attempt = 0; attempt < HYSTERESIS_MAX_RETRIES; attempt++) {
      try {
        const depositData = encodeFunctionData({
          abi: ichiVaultAbi,
          functionName: 'deposit',
          args: [amount, 0n, depositor],
        });

        const txHash = await walletClient.sendTransaction({
          to: vaultAddress,
          data: depositData,
          chain: walletClient.chain,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        return {
          txHash,
          success: receipt.status === 'success',
          gasUsed: receipt.gasUsed,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('try later') || msg.includes('hysteresis')) {
          console.warn(`[ichi] Deposit attempt ${attempt + 1}/${HYSTERESIS_MAX_RETRIES} failed (hysteresis). Retrying in ${HYSTERESIS_RETRY_DELAY_MS / 1000}s...`);
          if (attempt < HYSTERESIS_MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, HYSTERESIS_RETRY_DELAY_MS));
            continue;
          }
        }
        throw err;
      }
    }
    throw new Error('Ichi deposit failed after max retries (hysteresis)');
  }

  async withdraw(params: WithdrawParams): Promise<TxResult> {
    const { vaultAddress, shares, recipient, walletClient, publicClient } = params;

    const data = encodeFunctionData({
      abi: ichiVaultAbi,
      functionName: 'withdraw',
      args: [shares, recipient],
    });

    const txHash = await walletClient.sendTransaction({
      to: vaultAddress,
      data,
      chain: walletClient.chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      txHash,
      success: receipt.status === 'success',
      gasUsed: receipt.gasUsed,
    };
  }

  async getPosition(
    vaultAddress: Address,
    walletAddress: Address,
    client: PublicClient,
  ): Promise<VaultPosition> {
    const [shares, totalAmounts, totalSupply, token0, token1] = await Promise.all([
      client.readContract({ address: vaultAddress, abi: ichiVaultAbi, functionName: 'balanceOf', args: [walletAddress] }),
      client.readContract({ address: vaultAddress, abi: ichiVaultAbi, functionName: 'getTotalAmounts' }),
      client.readContract({ address: vaultAddress, abi: ichiVaultAbi, functionName: 'totalSupply' }),
      client.readContract({ address: vaultAddress, abi: ichiVaultAbi, functionName: 'token0' }),
      client.readContract({ address: vaultAddress, abi: ichiVaultAbi, functionName: 'token1' }),
    ]);

    const lpShares = shares as bigint;
    const supply = totalSupply as bigint;
    const amounts = totalAmounts as [bigint, bigint];

    const token0Amount = supply > 0n ? (lpShares * amounts[0]) / supply : 0n;
    const token1Amount = supply > 0n ? (lpShares * amounts[1]) / supply : 0n;

    return {
      vaultAddress,
      lpShares,
      token0Amount,
      token1Amount,
      token0: token0 as Address,
      token1: token1 as Address,
    };
  }

  getDepositToken(info: VaultInfo): { token: Address; decimals: number } {
    // Ichi vaults typically allow single-sided deposit on token0 (USDT)
    if (info.allowToken0) return { token: info.token0, decimals: 6 }; // USDT is 6 decimals
    if (info.allowToken1) return { token: info.token1, decimals: 18 }; // WETH is 18 decimals
    throw new Error('Vault does not allow deposits on either token');
  }

  private async getDepositTokenAddress(vaultAddress: Address, client: PublicClient): Promise<Address> {
    const info = await this.getVaultInfo(vaultAddress, client);
    return this.getDepositToken(info).token;
  }
}
