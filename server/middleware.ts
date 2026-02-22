/**
 * DARKCITY SERVER MIDDLEWARE
 * Authentication and request processing middleware
 */

import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthRequest extends Request {
  walletAddress?: string;
  agentId?: string;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Wallet signature authentication middleware
 * Verifies Solana wallet signature on every request
 */
export async function authenticateWallet(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-wallet-signature'] as string;
    const walletAddress = req.headers['x-wallet-address'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!signature || !walletAddress || !timestamp) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authentication headers',
        code: 'MISSING_AUTH',
      });
      return;
    }

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp, 10);
    if (Math.abs(now - reqTimestamp) > 300) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Signature expired',
        code: 'EXPIRED_SIGNATURE',
      });
      return;
    }

    // Construct message that was signed
    const message = `DARKCITY:${timestamp}:${walletAddress}`;
    const messageBytes = new TextEncoder().encode(message);

    // Decode signature and public key from base58
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);

    // Verify signature
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    // Attach wallet address to request
    req.walletAddress = walletAddress;
    
    // TODO: Look up agent ID from wallet address in database
    // For now, generate from wallet address
    req.agentId = `agent_${walletAddress.slice(0, 8)}`;

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Optional authentication (for public routes that optionally accept auth)
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const signature = req.headers['x-wallet-signature'] as string;
  const walletAddress = req.headers['x-wallet-address'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  // If no auth headers, continue without authentication
  if (!signature || !walletAddress || !timestamp) {
    next();
    return;
  }

  // If auth headers present, verify them
  await authenticateWallet(req, res, next);
}
