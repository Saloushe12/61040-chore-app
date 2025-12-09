// Server entry point for src-new (concept-based architecture)
// This uses raw MongoDB instead of Mongoose and concept-based routes

require('dotenv').config({ path: './.env' });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure allowed origins for CORS
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'https://six1040-chore-app-frontend.onrender.com'];

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug: Log all incoming requests (before routes)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Make io accessible in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join user's personal room for alerts
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Subscribe to venue updates
  socket.on('subscribe-venue', (venueId) => {
    socket.join(`venue-${venueId}`);
    console.log(`Socket ${socket.id} subscribed to venue ${venueId}`);
  });

  // Unsubscribe from venue updates
  socket.on('unsubscribe-venue', (venueId) => {
    socket.leave(`venue-${venueId}`);
    console.log(`Socket ${socket.id} unsubscribed from venue ${venueId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes (using concept-based routes from src-new)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/events', require('./routes/events'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/heatmap', require('./routes/heatmap'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), architecture: 'concept-based' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then((db) => {
    // Share the database connection with the database utility
    // This ensures concepts use the same connection
    const { setDb } = require('./utils/database');
    setDb(db);
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (src-new architecture)`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Architecture: Concept-based with raw MongoDB`);
      
      // Start automatic snapshot recording job (runs every 15 minutes)
      const { startSnapshotJob } = require('./jobs/snapshotRecording');
      startSnapshotJob();
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };

