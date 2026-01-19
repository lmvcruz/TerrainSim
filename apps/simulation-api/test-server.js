// Simple test server for Docker environment testing
// Does not require C++ bindings or build step
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Test API server running on port ${PORT}`);
});
