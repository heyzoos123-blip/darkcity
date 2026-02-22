import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Verify a Solana transaction signature exists and is confirmed
 */
export async function verifyTransaction(
  connection: Connection,
  signature: string
): Promise<boolean> {
  try {
    const txInfo = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
    
    return txInfo !== null && txInfo.meta !== null;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Validate Solana address
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get wallet balance
 */
export async function getBalance(
  connection: Connection,
  address: string
): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
}
