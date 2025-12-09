# WaitLess Implementation Plan

**Team: Guangdong Tigers**
Jonathan Zhao, Dylan Yu, Stephen Lee, Anna Kaganov

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Development Phases](#development-phases)
7. [API Endpoints](#api-endpoints)
8. [Key Technical Decisions](#key-technical-decisions)

---

## Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: MongoDB (flexible schema for evolving data models)
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io (with polling fallback)
- **Geolocation**: W3C Geolocation API + custom geofence logic
- **Hosting**: Heroku/Railway/Render (TBD based on free tier limits)

### Frontend
- **Framework**: React 18+
- **State Management**: React Context API + useReducer (avoid Redux complexity)
- **Routing**: React Router v6
- **Maps**: Google Maps JavaScript API (with Leaflet as fallback)
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client
- **UI Components**: Custom CSS (avoid heavy libraries for learning)
- **Build Tool**: Create React App (already initialized)

---

## Architecture Overview

### High-Level Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │ ◄─────► │   Express    │ ◄─────► │   MongoDB   │
│   Frontend  │  REST   │   Backend    │         │   Database  │
│             │ Socket  │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│   Google    │         │  Geofence    │
│   Maps API  │         │  Validator   │
└─────────────┘         └──────────────┘
```

### Folder Structure

#### Backend (`/server`)
```
server/
├── src-new/
│   ├── concepts/         # Concept-based business logic
│   │   ├── UserConcept.js
│   │   ├── VenueConcept.js
│   │   ├── VenueEventConcept.js
│   │   ├── WaitReportConcept.js
│   │   ├── VibeReportConcept.js
│   │   ├── AlertSubscriptionConcept.js
│   │   └── VenueStatsSnapshotConcept.js
│   ├── syncs/            # Coordination layer
│   │   ├── NearbyVenuesSync.js
│   │   ├── VenueDetailSync.js
│   │   ├── EventFilterSync.js
│   │   ├── HeatmapSync.js
│   │   ├── UserAlertsSync.js
│   │   ├── PeakForecastSync.js
│   │   ├── VenueDashboardSync.js
│   │   └── UserContributionHistorySync.js
│   ├── routes/           # API route handlers
│   │   ├── auth.js
│   │   ├── venues.js
│   │   ├── events.js
│   │   ├── reports.js
│   │   ├── alerts.js
│   │   └── heatmap.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js
│   │   └── validation.js
│   ├── services/         # Business logic
│   │   ├── geofence.js
│   │   ├── forecasting.js
│   │   └── notifications.js
│   ├── jobs/             # Background jobs
│   │   └── snapshotRecording.js
│   ├── utils/            # Helpers
│   │   ├── database.js
│   │   ├── seed.js
│   │   └── types.js
│   ├── config/           # Configuration
│   │   └── db.js
│   └── server.js         # Entry point
├── tests/
└── package.json
```

#### Frontend (`/waitless-frontend`)
```
waitless-frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   └── Modal.js
│   │   ├── venue/
│   │   │   ├── VenueCard.js
│   │   │   ├── VenueList.js
│   │   │   └── VenueDetail.js
│   │   ├── map/
│   │   │   ├── MapView.js
│   │   │   └── HeatMap.js
│   │   ├── reports/
│   │   │   ├── WaitReportForm.js
│   │   │   └── VibeReportForm.js
│   │   └── alerts/
│   │       └── AlertManager.js
│   ├── pages/            # Main views
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── VenueDetailPage.js
│   │   ├── UserProfile.js
│   │   └── VenueDashboard.js
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.js
│   │   ├── LocationContext.js
│   │   └── SocketContext.js
│   ├── hooks/            # Custom hooks
│   │   ├── useGeolocation.js
│   │   ├── useRealtime.js
│   │   └── useVenues.js
│   ├── services/         # API client
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── venues.js
│   │   └── reports.js
│   ├── utils/
│   │   ├── geofence.js
│   │   └── formatters.js
│   ├── App.js
│   └── index.js
├── public/
└── package.json
```

---

## Database Schema

### Collections

#### users
```javascript
{
  _id: ObjectId,
  role: String,              // 'patron' | 'venue_operator'
  displayName: String,       // optional, can be pseudonym
  email: String,             // for auth only, not shared
  passwordHash: String,
  homeArea: String,          // optional, city/neighborhood
  createdAt: Date,
  lastActiveAt: Date
}
```

#### venues
```javascript
{
  _id: ObjectId,
  name: String,
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]  // GeoJSON format
  },
  address: String,
  hours: {
    monday: { open: String, close: String },
    // ... other days
  },
  tags: [String],            // ['bar', 'club', 'restaurant']
  currentStatus: String,     // 'open' | 'closed' | 'door_hold'
  staticAttributes: {
    coverCharge: Number,
    accessibility: Boolean,
    minAge: Number
  },
  operatorUserId: ObjectId,  // optional
  createdAt: Date
}
```

#### venueEvents
```javascript
{
  _id: ObjectId,
  venueId: ObjectId,
  title: String,
  description: String,
  startTime: Date,
  endTime: Date,
  tags: [String],            // ['trivia', 'live_music', 'sports']
  createdBy: ObjectId,       // userId
  status: String,            // 'scheduled' | 'cancelled' | 'in_progress'
  createdAt: Date
}
```

#### waitReports
```javascript
{
  _id: ObjectId,
  venueId: ObjectId,
  userId: ObjectId,
  reportedWaitMinutes: Number,
  createdAt: Date,
  source: String,            // 'user' | 'venue_override'
  geofenceVerified: Boolean,
  location: {                // for verification only
    type: 'Point',
    coordinates: [longitude, latitude]
  }
}
```

#### vibeReports
```javascript
{
  _id: ObjectId,
  venueId: ObjectId,
  userId: ObjectId,
  crowdDensity: String,      // 'low' | 'medium' | 'high'
  noiseLevel: String,        // 'chill' | 'moderate' | 'loud'
  energyLevel: String,       // 'low' | 'medium' | 'hype'
  musicTags: [String],       // ['edm', 'hip_hop', 'jazz', 'live_band']
  createdAt: Date,
  geofenceVerified: Boolean,
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  }
}
```

#### alertSubscriptions
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  venueId: ObjectId,
  condition: {
    waitBelowMinutes: Number,      // optional
    crowdDensityIn: [String],      // optional ['low', 'medium']
    eventTag: String               // optional
  },
  active: Boolean,
  createdAt: Date
}
```

#### venueStatsSnapshots
```javascript
{
  _id: ObjectId,
  venueId: ObjectId,
  timestamp: Date,
  avgReportedWait: Number,
  avgCrowdDensity: Number,       // 0-2 scale (low=0, medium=1, high=2)
  reportCount: Number,
  derivedPeakScore: Number,      // 0-100 activity score
  dayOfWeek: Number,             // 0-6
  hourOfDay: Number              // 0-23
}
```

### Indexes
```javascript
// venues
db.venues.createIndex({ location: "2dsphere" });
db.venues.createIndex({ tags: 1 });

// waitReports
db.waitReports.createIndex({ venueId: 1, createdAt: -1 });
db.waitReports.createIndex({ userId: 1, venueId: 1, createdAt: -1 });

// vibeReports
db.vibeReports.createIndex({ venueId: 1, createdAt: -1 });

// venueEvents
db.venueEvents.createIndex({ venueId: 1, startTime: 1 });
db.venueEvents.createIndex({ tags: 1, startTime: 1 });

// venueStatsSnapshots
db.venueStatsSnapshots.createIndex({ venueId: 1, timestamp: -1 });
db.venueStatsSnapshots.createIndex({ venueId: 1, dayOfWeek: 1, hourOfDay: 1 });
```

---

## Backend Implementation

### Phase 1: Core Setup (Alpha)

#### 1.1 Project Initialization
```bash
mkdir server
cd server
npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

#### 1.2 Database Connection (`src/config/db.js`)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

#### 1.3 Authentication Middleware (`src/middleware/auth.js`)
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) throw new Error();

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;
```

#### 1.4 Geofence Service (`src/services/geofence.js`)
```javascript
// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

const verifyGeofence = (userLocation, venueLocation, radiusMeters = 100) => {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    venueLocation.coordinates[1],
    venueLocation.coordinates[0]
  );
  return distance <= radiusMeters;
};

module.exports = { verifyGeofence, calculateDistance };
```

### Phase 2: Core Features (Beta)

#### 2.1 Aggregation Service (`src/services/aggregation.js`)
```javascript
const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');

// Get current venue metrics
const getCurrentVenueMetrics = async (venueId, timeWindowMinutes = 30) => {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Aggregate wait reports
  const waitReports = await WaitReport.find({
    venueId,
    createdAt: { $gte: cutoffTime },
    geofenceVerified: true
  });

  const avgWait = waitReports.length > 0
    ? waitReports.reduce((sum, r) => sum + r.reportedWaitMinutes, 0) / waitReports.length
    : null;

  // Aggregate vibe reports
  const vibeReports = await VibeReport.find({
    venueId,
    createdAt: { $gte: cutoffTime },
    geofenceVerified: true
  });

  // Calculate mode for categorical data
  const crowdCounts = { low: 0, medium: 0, high: 0 };
  vibeReports.forEach(r => crowdCounts[r.crowdDensity]++);
  const crowdDensity = Object.keys(crowdCounts).reduce((a, b) =>
    crowdCounts[a] > crowdCounts[b] ? a : b
  );

  return {
    avgWait,
    crowdDensity,
    reportCount: waitReports.length + vibeReports.length,
    lastUpdated: new Date()
  };
};

module.exports = { getCurrentVenueMetrics };
```

#### 2.2 Forecasting Service (`src/services/forecasting.js`)
```javascript
const VenueStatsSnapshot = require('../models/VenueStatsSnapshot');

// Simple bucket-based forecasting
const getPeakForecast = async (venueId) => {
  const now = new Date();
  const currentDayOfWeek = now.getDay();

  // Get snapshots from same day of week, last 4 weeks
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const snapshots = await VenueStatsSnapshot.find({
    venueId,
    dayOfWeek: currentDayOfWeek,
    timestamp: { $gte: fourWeeksAgo }
  });

  // Group by hour and calculate average peak score
  const hourlyAverages = {};
  snapshots.forEach(s => {
    if (!hourlyAverages[s.hourOfDay]) {
      hourlyAverages[s.hourOfDay] = { sum: 0, count: 0 };
    }
    hourlyAverages[s.hourOfDay].sum += s.derivedPeakScore;
    hourlyAverages[s.hourOfDay].count += 1;
  });

  const forecast = Object.keys(hourlyAverages).map(hour => ({
    hour: parseInt(hour),
    peakScore: hourlyAverages[hour].sum / hourlyAverages[hour].count,
    confidence: Math.min(hourlyAverages[hour].count / 4, 1) // 0-1 based on data points
  }));

  return forecast.sort((a, b) => a.hour - b.hour);
};

module.exports = { getPeakForecast };
```

#### 2.3 Notification Service (`src/services/notifications.js`)
```javascript
const AlertSubscription = require('../models/AlertSubscription');
const { getCurrentVenueMetrics } = require('./aggregation');

// Check and trigger alerts for a venue
const triggerAlertsForVenue = async (venueId, io) => {
  const metrics = await getCurrentVenueMetrics(venueId);

  const activeSubscriptions = await AlertSubscription.find({
    venueId,
    active: true
  }).populate('userId');

  for (const sub of activeSubscriptions) {
    let shouldTrigger = false;
    let message = '';

    // Check wait time condition
    if (sub.condition.waitBelowMinutes !== undefined &&
        metrics.avgWait !== null &&
        metrics.avgWait < sub.condition.waitBelowMinutes) {
      shouldTrigger = true;
      message = `Wait time at ${venueId} is now ${Math.round(metrics.avgWait)} minutes!`;
    }

    // Check crowd density condition
    if (sub.condition.crowdDensityIn &&
        sub.condition.crowdDensityIn.includes(metrics.crowdDensity)) {
      shouldTrigger = true;
      message = `Crowd level at ${venueId} is now ${metrics.crowdDensity}!`;
    }

    if (shouldTrigger) {
      // Emit via Socket.io
      io.to(sub.userId._id.toString()).emit('alert', {
        subscriptionId: sub._id,
        venueId,
        message,
        metrics
      });
    }
  }
};

module.exports = { triggerAlertsForVenue };
```

### Phase 3: Real-time Updates

#### 3.1 Socket.io Setup (`src/server.js`)
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Join user's personal room for alerts
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Subscribe to venue updates
  socket.on('subscribe-venue', (venueId) => {
    socket.join(`venue-${venueId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make io accessible in routes
app.set('io', io);

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/reports', require('./routes/reports'));
// ... other routes

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Frontend Implementation

### Phase 1: Core Setup (Alpha)

#### 1.1 Authentication Context (`src/contexts/AuthContext.js`)
```javascript
import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then(user => setUser(user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { user, token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 1.2 Location Hook (`src/hooks/useGeolocation.js`)
```javascript
import { useState, useEffect } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error, loading };
};
```

#### 1.3 API Service (`src/services/api.js`)
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Phase 2: Core Components (Beta)

#### 2.1 Map View Component (`src/components/map/MapView.js`)
```javascript
import React, { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';

const MapView = ({ venues, onVenueClick }) => {
  const mapRef = useRef(null);
  const { location } = useGeolocation();
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    // Initialize Google Maps
    if (!location || map) return;

    const googleMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: location.latitude, lng: location.longitude },
      zoom: 14
    });

    setMap(googleMap);
  }, [location, map]);

  useEffect(() => {
    if (!map || !venues) return;

    // Clear existing markers
    markers.forEach(m => m.setMap(null));

    // Create new markers
    const newMarkers = venues.map(venue => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: venue.location.coordinates[1],
          lng: venue.location.coordinates[0]
        },
        map,
        title: venue.name,
        icon: getMarkerIcon(venue.metrics?.crowdDensity)
      });

      marker.addListener('click', () => onVenueClick(venue));
      return marker;
    });

    setMarkers(newMarkers);
  }, [map, venues]);

  const getMarkerIcon = (crowdDensity) => {
    const colors = {
      low: 'green',
      medium: 'yellow',
      high: 'red'
    };
    const color = colors[crowdDensity] || 'gray';
    return `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`;
  };

  return <div ref={mapRef} style={{ width: '100%', height: '500px' }} />;
};

export default MapView;
```

#### 2.2 Wait Report Form (`src/components/reports/WaitReportForm.js`)
```javascript
import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reportsService } from '../../services/reports';

const WaitReportForm = ({ venue, onSubmit }) => {
  const [waitMinutes, setWaitMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { location } = useGeolocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await reportsService.submitWaitReport(venue._id, {
        reportedWaitMinutes: parseInt(waitMinutes),
        location
      });
      onSubmit();
      setWaitMinutes('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Wait Time (minutes):
        <input
          type="number"
          min="0"
          max="120"
          value={waitMinutes}
          onChange={(e) => setWaitMinutes(e.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={submitting || !location}>
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
      {!location && <p>Waiting for location...</p>}
    </form>
  );
};

export default WaitReportForm;
```

#### 2.3 Venue Card Component (`src/components/venue/VenueCard.js`)
```javascript
import React from 'react';
import './VenueCard.css';

const VenueCard = ({ venue, onClick }) => {
  const { name, address, metrics, currentStatus } = venue;

  const getCrowdColor = (density) => {
    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336'
    };
    return colors[density] || '#999';
  };

  return (
    <div className="venue-card" onClick={() => onClick(venue)}>
      <div className="venue-header">
        <h3>{name}</h3>
        <span className={`status-badge ${currentStatus}`}>
          {currentStatus}
        </span>
      </div>

      <p className="venue-address">{address}</p>

      {metrics && (
        <div className="venue-metrics">
          <div className="metric">
            <span className="metric-label">Wait:</span>
            <span className="metric-value">
              {metrics.avgWait ? `${Math.round(metrics.avgWait)} min` : 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Crowd:</span>
            <span
              className="metric-value"
              style={{ color: getCrowdColor(metrics.crowdDensity) }}
            >
              {metrics.crowdDensity || 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Reports:</span>
            <span className="metric-value">{metrics.reportCount || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueCard;
```

### Phase 3: Real-time Features

#### 3.1 Socket Context (`src/contexts/SocketContext.js`)
```javascript
import React, { createContext, useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join', user._id);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
```

#### 3.2 Real-time Hook (`src/hooks/useRealtime.js`)
```javascript
import { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const useRealtime = (venueId) => {
  const socket = useContext(SocketContext);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!socket || !venueId) return;

    socket.emit('subscribe-venue', venueId);

    const handleUpdate = (data) => {
      setUpdates(prev => [data, ...prev].slice(0, 10)); // Keep last 10 updates
    };

    socket.on('venue-update', handleUpdate);
    socket.on('alert', handleUpdate);

    return () => {
      socket.off('venue-update', handleUpdate);
      socket.off('alert', handleUpdate);
    };
  }, [socket, venueId]);

  return updates;
};
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/me                - Get current user
```

### Venues
```
GET    /api/venues                 - Get nearby venues (requires lat/lon query params)
GET    /api/venues/:id             - Get venue details
POST   /api/venues                 - Create venue (operator only)
PATCH  /api/venues/:id             - Update venue (operator only)
PATCH  /api/venues/:id/status      - Update venue status (operator only)
GET    /api/venues/:id/forecast    - Get peak time forecast
```

### Events
```
GET    /api/events                 - Get events (with filters)
POST   /api/events                 - Create event
PATCH  /api/events/:id             - Update event
DELETE /api/events/:id             - Cancel event
```

### Reports
```
POST   /api/reports/wait           - Submit wait report
POST   /api/reports/vibe           - Submit vibe report
GET    /api/reports/history        - Get user's report history
```

### Alerts
```
GET    /api/alerts                 - Get user's alert subscriptions
POST   /api/alerts                 - Create alert subscription
PATCH  /api/alerts/:id             - Update alert subscription
DELETE /api/alerts/:id             - Delete alert subscription
```

### Analytics
```
GET    /api/analytics/heatmap      - Get area heatmap data
GET    /api/analytics/dashboard    - Get venue operator dashboard
```

---

## Development Phases

### Alpha Checkpoint (Week 1-2)
**Dylan** - Database & Auth
- [ ] Set up MongoDB Atlas account
- [ ] Create database schema and models
- [ ] Implement user authentication (JWT)
- [ ] Create seed data for testing

**Jonathan** - Backend Foundation
- [ ] Initialize Express server
- [ ] Set up basic routes structure
- [ ] Implement auth middleware
- [ ] Create API endpoints for auth

**Stephen** - Map Integration
- [ ] Set up Google Maps API key
- [ ] Create basic MapView component
- [ ] Implement geolocation hook
- [ ] Display venues on map

**Anna** - UI Foundation
- [ ] Create basic page layouts (Home, Login, VenueDetail)
- [ ] Design and implement VenueCard component
- [ ] Set up React Router
- [ ] Create basic CSS styling

**Deliverable**: Users can register/login, view venues on a map, and see basic venue information.

---

### Beta Checkpoint (Week 3-4)
**Dylan** - Data Aggregation
- [ ] Implement aggregation service for venue metrics
- [ ] Create VenueStatsSnapshot collection logic
- [ ] Build snapshot recording cron job (every 15 min)
- [ ] Implement one-report-per-visit constraint

**Jonathan** - Real-time Updates
- [ ] Set up Socket.io on backend
- [ ] Create SocketContext on frontend
- [ ] Implement real-time venue updates
- [ ] Build notification infrastructure

**Stephen** - Geofence & Heatmap
- [ ] Implement geofence verification service
- [ ] Create heatmap aggregation logic
- [ ] Build HeatMap component
- [ ] Add geofence verification to report submissions

**Anna** - Report Forms & Feed
- [ ] Create WaitReportForm component
- [ ] Create VibeReportForm component
- [ ] Implement real-time feed display
- [ ] Add user profile with contribution history

**Deliverable**: Users can submit verified reports, see real-time updates, view heatmaps, and track their contributions.

---

### User Testing (Week 5-6)
**Dylan** - Forecasting
- [ ] Implement peak time forecasting algorithm
- [ ] Create forecast API endpoint
- [ ] Add forecast visualization component
- [ ] Optimize database queries with indexes

**Jonathan** - Alerts
- [ ] Build alert subscription management
- [ ] Implement alert condition checking
- [ ] Create in-browser notification system
- [ ] Add alert UI components

**Stephen** - Privacy Features
- [ ] Implement anonymous reporting option
- [ ] Add location privacy controls
- [ ] Create privacy settings page
- [ ] Test geofence edge cases

**Anna** - Testing & Polish
- [ ] Coordinate user testing sessions
- [ ] Collect and document feedback
- [ ] Fix critical bugs
- [ ] Improve UI/UX based on feedback

**Deliverable**: Full feature set with alerts, forecasting, and privacy controls. Gather user feedback.

---

### Full Demo (Week 7)
**All Team Members**
- [ ] Address all user testing feedback
- [ ] Polish UI/UX
- [ ] Performance optimization
- [ ] Create demo presentation
- [ ] Prepare demo data/scenarios
- [ ] Practice demo presentation

**Deliverable**: Polished, demo-ready application.

---

## Key Technical Decisions

### 1. Spam Prevention Without Reputation System
**Problem**: Design doc says "no reputation scores" but dev plan mentions "reputation weighting."

**Decision**:
- Store `lastActiveAt` timestamp only (no persistent scores)
- Enforce one report per user per venue per 3-hour window (configurable)
- Use geofence verification as primary trust signal
- Allow venue operators to override with `venue_override` source
- Implement rate limiting (max 10 reports per hour per user)

**Implementation**:
```javascript
// Check for duplicate reports in timeframe
const recentReport = await WaitReport.findOne({
  userId,
  venueId,
  createdAt: { $gte: new Date(Date.now() - 3 * 60 * 60 * 1000) }
});

if (recentReport) {
  throw new Error('You already submitted a report for this venue recently');
}
```

### 2. Geofence Radius
**Decision**: Use 100-meter radius for venue check-ins

**Rationale**:
- Balances accuracy with GPS precision limitations (typical accuracy 10-50m)
- Allows check-in from nearby streets/parking
- Can be adjusted per-venue for large venues (stadiums, etc.)

### 3. Data Aggregation Time Windows
**Decision**:
- **Current metrics**: Last 30 minutes of verified reports
- **Snapshots**: Every 15 minutes
- **Forecast lookback**: Last 4 weeks, same day of week

**Rationale**:
- 30 min is recent enough for nightlife (conditions change quickly)
- 15 min snapshots balance granularity with storage
- 4 weeks provides enough data without being stale

### 4. Real-time vs Polling
**Decision**: Implement Socket.io for real-time, with polling fallback

**Rationale**:
- Socket.io provides better UX for live updates
- Polling fallback ensures compatibility
- Start with 30-second polling in Alpha, add Socket.io in Beta

### 5. Map Provider
**Decision**: Start with Google Maps, Leaflet + OpenStreetMap as fallback

**Rationale**:
- Google Maps has better documentation and features
- Free tier sufficient for demo/testing (28,000 loads/month)
- Leaflet fallback if costs become an issue

### 6. Venue Operator Verification
**Decision**: Defer to post-demo (trust-based for MVP)

**Rationale**:
- Complex verification (business documents, email domains) adds scope
- For demo, manual verification or honor system sufficient
- Can implement email verification with business domain check later

### 7. Alert Delivery
**Decision**: In-browser notifications only (no push notifications)

**Rationale**:
- Push notifications require service workers and HTTPS
- In-browser sufficient for demo (user must have app open)
- Avoids complexity of FCM/APNS integration

### 8. Database Choice
**Decision**: MongoDB over PostgreSQL

**Rationale**:
- GeoJSON support for location queries
- Flexible schema for evolving data models
- Better for rapid prototyping
- Team familiarity

---

## Environment Variables

### Backend (`.env`)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key_here
PORT=5000
CLIENT_URL=http://localhost:3000
GOOGLE_MAPS_API_KEY=your_api_key_here
NODE_ENV=development
```

### Frontend (`.env`)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

## Testing Strategy

### Backend Testing
- **Unit Tests**: Services (aggregation, geofence, forecasting)
- **Integration Tests**: API endpoints
- **Tools**: Jest + Supertest

### Frontend Testing
- **Component Tests**: Critical components (forms, map)
- **E2E Tests**: User flows (login, submit report, create alert)
- **Tools**: React Testing Library + Jest

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Venue discovery (map and list view)
- [ ] Submit wait report with geofence verification
- [ ] Submit vibe report
- [ ] Create alert subscription
- [ ] Receive alert when condition met
- [ ] View venue forecast
- [ ] View heatmap
- [ ] Operator dashboard (if implemented)

---

## Deployment Plan

### Backend Deployment (Render/Railway)
1. Create account and new web service
2. Connect GitHub repository
3. Set environment variables
4. Configure build command: `npm install`
5. Configure start command: `node src-new/server.js`
6. Deploy and verify

### Frontend Deployment (Netlify/Vercel)
1. Create account and new site
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables
6. Deploy and verify

### Database (MongoDB Atlas)
1. Create free tier cluster
2. Configure network access (allow all for dev, restrict for prod)
3. Create database user
4. Get connection string
5. Add to backend environment variables

---

## Success Metrics

### Alpha
- Users can register and login
- At least 5 seed venues display on map
- Basic venue information visible

### Beta
- Users can submit verified reports
- Real-time updates working
- Aggregation showing current metrics

### User Testing
- 5+ test users complete user journey
- Alerts trigger correctly
- Forecasts display (even with limited data)

### Full Demo
- Complete user journey works end-to-end
- No critical bugs
- UI is polished and responsive
- Demo data shows all features

---

## Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Socket.io Docs](https://socket.io/docs/)
- [React Docs](https://react.dev/)
- [Google Maps API](https://developers.google.com/maps/documentation)

### Tools
- **API Testing**: Postman/Insomnia
- **Database GUI**: MongoDB Compass
- **Version Control**: Git + GitHub
- **Communication**: Slack/Discord

---

## Next Steps

1. **Team Meeting**: Review this plan and assign initial tasks
2. **Environment Setup**: Each member sets up dev environment
3. **Repository Structure**: Create `/server` and update `/app` folders
4. **Sprint Planning**: Create GitHub Issues for Alpha tasks
5. **Daily Standups**: 15-min sync on progress and blockers