require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const connectDB       = require('./src/config/db');
const errorHandler    = require('./src/middleware/errorHandler');
const authRoutes      = require('./src/routes/auth');
const logRoutes       = require('./src/routes/logs');
const incidentRoutes  = require('./src/routes/incidents');
const forensicsRoutes = require('./src/routes/forensics');
const dashboardRoutes = require('./src/routes/dashboard');
const systemRoutes    = require('./src/routes/systemTest');

const app = express();

// Database
connectDB();

// Global Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/logs',      logRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/forensics', forensicsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/system',    systemRoutes);

// Health
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Cloud Forensics API v1' })
);

// Error Handler (must be last)
app.use(errorHandler);

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log('Backend running on port ' + PORT)
);

module.exports = app;