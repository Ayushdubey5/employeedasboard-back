const express = require('express');
const cors = require('cors');
const path = require('path');

const crmRoutes = require('./routes/crmRoutes');
const helpdeskRoutes = require('./routes/helpdeskRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173','https://employeedashboard-iymaj04t2-ayushdubey5s-projects.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/crm', crmRoutes);
app.use('/api/hd', helpdeskRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Employee Task Dashboard Backend`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   CRM API:      http://localhost:${PORT}/api/crm/tasks`);
  console.log(`   Helpdesk API:  http://localhost:${PORT}/api/hd/tasks`);
  console.log(`   Aggregated:    http://localhost:${PORT}/api/tasks`);
  console.log(`   Health Check:  http://localhost:${PORT}/api/health\n`);
});