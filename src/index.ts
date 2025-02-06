import express from 'express';
import dotenv from 'dotenv';
import { cronRouter } from './api/cron';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// CORS ayarları
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// API rotaları
app.use('/api/cron', cronRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 