import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { supabase, getLastCheckTimestamp, updateLastCheckTimestamp, saveTransaction, savePiece } from './supabase';

// Solana bağlantısı (testnet)
const connection = new Connection(clusterApiUrl('testnet'), {
  commitment: 'confirmed',
  wsEndpoint: 'wss://api.testnet.solana.com/',
  confirmTransactionInitialTimeout: 60000,
});

if (!process.env.TARGET_WALLET_ADDRESS) {
  throw new Error('TARGET_WALLET_ADDRESS is not set');
}

const TARGET_WALLET = new PublicKey(process.env.TARGET_WALLET_ADDRESS);

let isProcessing = false;
let revealedPieceIds: Set<number>;

async function initRevealedPieces() {
  try {
    const { data: pieces } = await supabase
      .from('pieces')
      .select('piece_id');
    
    revealedPieceIds = new Set(pieces?.map(p => p.piece_id));
    console.log('Worker: Revealed pieces initialized:', revealedPieceIds.size);
  } catch (error) {
    console.error('Worker: Error initializing revealed pieces:', error);
    revealedPieceIds = new Set();
  }
}

function getRandomUnrevealedPiece(): number {
  let pieceId;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    pieceId = Math.floor(Math.random() * 9999);
    attempts++;
  } while (revealedPieceIds?.has(pieceId) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    console.log('Worker: Warning: Could not find unrevealed piece after', maxAttempts, 'attempts');
    return Math.floor(Math.random() * 9999);
  }

  return pieceId;
}

export async function processTransactions(): Promise<boolean> {
  if (isProcessing) {
    console.log('Worker: Already processing transactions');
    return false;
  }

  try {
    isProcessing = true;

    if (!revealedPieceIds) {
      await initRevealedPieces();
    }

    const lastTimestamp = await getLastCheckTimestamp();
    const currentTimestamp = Date.now();
    
    console.log('Worker: Checking transactions since:', new Date(lastTimestamp).toISOString());
    
    const signatures = await connection.getSignaturesForAddress(
      TARGET_WALLET,
      { limit: 10 }
    );

    await updateLastCheckTimestamp(currentTimestamp);

    if (signatures.length === 0) {
      return true;
    }

    const transactions = await Promise.all(
      signatures
        .filter(sig => new Date(sig.blockTime! * 1000).getTime() > lastTimestamp)
        .map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature);
            if (!tx) return null;

            const walletAddress = tx.transaction.message.accountKeys[0].toString();
            const amount = tx.meta?.postBalances[0] || 0;

            console.log('Worker: Processing transaction:', {
              signature: sig.signature,
              walletAddress,
              amount,
              blockTime: new Date(sig.blockTime! * 1000).toISOString()
            });

            const txId = await saveTransaction(sig.signature, walletAddress, amount);
            const pieceId = getRandomUnrevealedPiece();
            revealedPieceIds?.add(pieceId);
            await savePiece(pieceId, walletAddress, txId);

            return { pieceId, walletAddress };
          } catch (error) {
            console.error('Worker: Error processing transaction:', sig.signature, error);
            return null;
          }
        })
    );

    const validTransactions = transactions.filter(tx => tx !== null);
    console.log('Worker: Processed valid transactions:', validTransactions.length);
    return true;
  } catch (error) {
    console.error('Worker: Error processing transactions:', error);
    return false;
  } finally {
    isProcessing = false;
  }
} 