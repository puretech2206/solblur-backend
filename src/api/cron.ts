import { Router } from 'express';
import { processTransactions } from '../lib/solana';

export const cronRouter = Router();

let lastRunTime = 0;
const RUN_INTERVAL = 300000; // 5 dakika

cronRouter.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (now - lastRunTime < RUN_INTERVAL) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too soon to run again' 
      });
    }

    const success = await processTransactions();
    lastRunTime = now;

    return res.json({ success });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}); 