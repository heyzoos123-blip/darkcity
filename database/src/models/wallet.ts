import { Wallet, Transaction, TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { getDatabase } from '../client';

/**
 * Wallet Management Service
 */
export class WalletService {
  private db = getDatabase();

  /**
   * Get or create wallet for a character
   */
  async getOrCreateWallet(characterId: string, currency: string, address?: string): Promise<Wallet> {
    const existing = await this.db.wallet.findUnique({
      where: {
        characterId_currency: { characterId, currency },
      },
    });

    if (existing) return existing;

    return this.db.wallet.create({
      data: {
        characterId,
        currency,
        address,
        balance: BigInt(0),
      },
    });
  }

  /**
   * Get character's wallets
   */
  async getWallets(characterId: string): Promise<Wallet[]> {
    return this.db.wallet.findMany({
      where: { characterId, isActive: true },
    });
  }

  /**
   * Get wallet by address (for Solana lookups)
   */
  async getByAddress(address: string): Promise<Wallet | null> {
    return this.db.wallet.findFirst({
      where: { address },
    });
  }

  /**
   * Get balance
   */
  async getBalance(characterId: string, currency: string): Promise<bigint> {
    const wallet = await this.getOrCreateWallet(characterId, currency);
    return wallet.balance;
  }

  /**
   * Update balance (raw operation)
   */
  async updateBalance(walletId: string, amount: bigint): Promise<Wallet> {
    return this.db.wallet.update({
      where: { id: walletId },
      data: { balance: amount },
    });
  }

  /**
   * Transfer between wallets
   */
  async transfer(
    fromCharacterId: string,
    toCharacterId: string,
    currency: string,
    amount: bigint,
    type: TransactionType = TransactionType.TRANSFER,
    description?: string,
    metadata?: any
  ): Promise<Transaction> {
    return this.db.$transaction(async (tx) => {
      // Get wallets
      const fromWallet = await tx.wallet.findUnique({
        where: { characterId_currency: { characterId: fromCharacterId, currency } },
      });

      const toWallet = await tx.wallet.findUnique({
        where: { characterId_currency: { characterId: toCharacterId, currency } },
      });

      if (!fromWallet) throw new Error('Sender wallet not found');
      if (!toWallet) throw new Error('Recipient wallet not found');

      // Check balance
      if (fromWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update balances
      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: fromWallet.balance - amount },
      });

      await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: toWallet.balance + amount },
      });

      // Create transaction record
      return tx.transaction.create({
        data: {
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          amount,
          currency,
          type,
          status: TransactionStatus.CONFIRMED,
          description,
          metadata,
          completedAt: new Date(),
        },
      });
    });
  }

  /**
   * Add funds (for rewards, purchases, etc.)
   */
  async addFunds(
    characterId: string,
    currency: string,
    amount: bigint,
    type: TransactionType,
    description?: string,
    metadata?: any
  ): Promise<Transaction> {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { characterId_currency: { characterId, currency } },
      });

      if (!wallet) throw new Error('Wallet not found');

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance + amount },
      });

      return tx.transaction.create({
        data: {
          toWalletId: wallet.id,
          amount,
          currency,
          type,
          status: TransactionStatus.CONFIRMED,
          description,
          metadata,
          completedAt: new Date(),
        },
      });
    });
  }

  /**
   * Deduct funds (for purchases, fees, etc.)
   */
  async deductFunds(
    characterId: string,
    currency: string,
    amount: bigint,
    type: TransactionType,
    description?: string,
    metadata?: any
  ): Promise<Transaction> {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { characterId_currency: { characterId, currency } },
      });

      if (!wallet) throw new Error('Wallet not found');
      if (wallet.balance < amount) throw new Error('Insufficient balance');

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - amount },
      });

      return tx.transaction.create({
        data: {
          fromWalletId: wallet.id,
          amount,
          currency,
          type,
          status: TransactionStatus.CONFIRMED,
          description,
          metadata,
          completedAt: new Date(),
        },
      });
    });
  }
}

/**
 * Transaction History Service
 */
export class TransactionService {
  private db = getDatabase();

  /**
   * Record blockchain transaction
   */
  async recordBlockchainTransaction(data: {
    fromWalletId?: string;
    toWalletId?: string;
    amount: bigint;
    currency: string;
    signature: string;
    type: TransactionType;
    blockTime?: Date;
    description?: string;
    metadata?: any;
  }): Promise<Transaction> {
    return this.db.transaction.create({
      data: {
        ...data,
        status: TransactionStatus.PENDING,
      },
    });
  }

  /**
   * Confirm pending transaction
   */
  async confirmTransaction(id: string, blockTime?: Date): Promise<Transaction> {
    return this.db.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.CONFIRMED,
        completedAt: blockTime || new Date(),
        blockTime,
      },
    });
  }

  /**
   * Fail transaction
   */
  async failTransaction(id: string): Promise<Transaction> {
    return this.db.transaction.update({
      where: { id },
      data: { status: TransactionStatus.FAILED },
    });
  }

  /**
   * Get transaction by signature
   */
  async getBySignature(signature: string): Promise<Transaction | null> {
    return this.db.transaction.findUnique({
      where: { signature },
    });
  }

  /**
   * Get character's transaction history
   */
  async getHistory(characterId: string, options?: {
    currency?: string;
    type?: TransactionType;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    // Get character's wallets
    const wallets = await this.db.wallet.findMany({
      where: { characterId },
      select: { id: true },
    });

    const walletIds = wallets.map(w => w.id);

    const where: Prisma.TransactionWhereInput = {
      OR: [
        { fromWalletId: { in: walletIds } },
        { toWalletId: { in: walletIds } },
      ],
    };

    if (options?.currency) where.currency = options.currency;
    if (options?.type) where.type = options.type;

    return this.db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
      include: {
        fromWallet: {
          include: { character: { select: { id: true, name: true } } },
        },
        toWallet: {
          include: { character: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * Get pending transactions
   */
  async getPending(): Promise<Transaction[]> {
    return this.db.transaction.findMany({
      where: { status: TransactionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get transaction statistics
   */
  async getStats(characterId: string, currency?: string): Promise<{
    totalSent: bigint;
    totalReceived: bigint;
    transactionCount: number;
  }> {
    const wallets = await this.db.wallet.findMany({
      where: { characterId, ...(currency && { currency }) },
      select: { id: true },
    });

    const walletIds = wallets.map(w => w.id);

    const sent = await this.db.transaction.aggregate({
      where: {
        fromWalletId: { in: walletIds },
        status: TransactionStatus.CONFIRMED,
      },
      _sum: { amount: true },
      _count: true,
    });

    const received = await this.db.transaction.aggregate({
      where: {
        toWalletId: { in: walletIds },
        status: TransactionStatus.CONFIRMED,
      },
      _sum: { amount: true },
    });

    return {
      totalSent: sent._sum.amount || BigInt(0),
      totalReceived: received._sum.amount || BigInt(0),
      transactionCount: sent._count,
    };
  }
}
