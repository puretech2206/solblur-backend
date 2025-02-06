import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!process.env.SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export interface Transaction {
  signature: string;
  wallet_address: string;
  amount: number;
}

export interface Piece {
  piece_id: number;
  wallet_address: string;
  transaction_id: number;
}

export async function saveTransaction(signature: string, walletAddress: string, amount: number) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{ signature, wallet_address: walletAddress, amount }])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function savePiece(pieceId: number, walletAddress: string, transactionId: number) {
  const { error } = await supabase
    .from('pieces')
    .insert([{
      piece_id: pieceId,
      wallet_address: walletAddress,
      transaction_id: transactionId
    }]);

  if (error) throw error;
}

export async function getLastCheckTimestamp(): Promise<number> {
  const { data, error } = await supabase
    .from('last_check')
    .select('timestamp')
    .eq('id', 1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return Date.now();
    throw error;
  }

  return data.timestamp;
}

export async function updateLastCheckTimestamp(timestamp: number) {
  const { error } = await supabase
    .from('last_check')
    .upsert({ id: 1, timestamp })
    .eq('id', 1);

  if (error) throw error;
} 