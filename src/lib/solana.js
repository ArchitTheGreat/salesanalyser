import { Connection, PublicKey } from '@solana/web3.js';

// Public devnet endpoint to avoid 403 Forbidden errors on local frontend
const RPC_URL = 'https://api.devnet.solana.com';

export const getConnection = () => {
  return new Connection(RPC_URL, 'confirmed');
};

/**
 * Fetch last N transactions logic (Real Signatures)
 */
export async function getRecentTransactions(walletAddress, limit = 150) {
  const connection = getConnection();
  const pubKey = new PublicKey(walletAddress);

  // Fetch signatures
  const signatures = await connection.getSignaturesForAddress(pubKey, { limit });

  // Map to a clean structure for the AI to analyze
  const transactions = signatures.map(sig => ({
    signature: sig.signature,
    timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date().toISOString(),
    status: sig.confirmationStatus,
    err: sig.err,
    memo: sig.memo,
    address: walletAddress,
  }));

  return transactions;
}
