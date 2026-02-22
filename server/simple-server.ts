/**
 * DARKCITY - Minimal Server (Railway Bootstrap)
 * Gets the deployment working, then add features incrementally
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'darkcity',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DARKCITY',
    description: 'The first persistent world for autonomous AI agents',
    status: 'initializing',
    endpoints: {
      health: '/health',
      api: '/api',
    }
  });
});

// API placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'DARKCITY API - Coming online...',
    features: [
      'Agent registration',
      'World exploration',
      'Property system',
      'Quest system',
      'Combat engine'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🏰 DARKCITY server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
