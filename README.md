# WaitLess - Real-Time Venue Information System

WaitLess is a real-time urban nightlife location-based consumer information system that crowdsources wait times, crowd density, and venue atmosphere data.

## Team: Guangdong Tigers
- Jonathan Zhao
- Dylan Yu
- Stephen Lee
- Anna Kaganov

## Project Overview

WaitLess solves two interconnected problems:
1. Users' inability to make informed decisions about where to go
2. Venues' difficulty managing operations without real-time capacity data

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB (raw driver with concept-based architecture)
- Socket.io (real-time updates)
- JWT authentication
- Geospatial queries & geofence verification

### Frontend
- React 18
- React Router v6
- Axios (API calls)
- Socket.io-client (real-time)
- Context API (state management)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd 61040-chore-app
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/waitless
JWT_SECRET=your_secret_key_here
PORT=5000
CLIENT_URL=http://localhost:3000
GEOFENCE_RADIUS_METERS=100
```

### 3. Frontend Setup

```bash
cd waitless-frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Running the Application

### Start Backend Server

```bash
cd server
npm run dev
```

Backend will run on `http://localhost:5000`

### Seed Database (Optional but Recommended)

**Quick Seed (Venues Only):**
```bash
cd server
npm run seed
```

**Full Seed (Realistic Dummy Data):**
```bash
cd server
npm run seed:full
```

This will create:
- 20 test users (patrons) and 5 operators
- Venues (if none exist)
- Wait reports and vibe reports over the past 2 weeks
- Upcoming and past events
- Alert subscriptions
- Historical snapshots for forecasting

Test accounts: `user1@example.com` through `user20@example.com` (password: `password123`)

**Boston Venues Seed (Alternative):**
```bash
cd server
npm run seed
# or
node src-new/utils/seed.js
```

This will:
- Create **25+ Boston venues** across multiple neighborhoods (Downtown, Back Bay, Fenway, Seaport, South End, Allston, Cambridge)
- All venues include location data, hours, tags, and static attributes

### Start Frontend

```bash
cd waitless-frontend
npm start
```

Frontend will run on `http://localhost:3000`

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Venues
- `GET /api/venues` - Get nearby venues (requires `latitude`, `longitude`)
- `GET /api/venues/:id` - Get venue details with metrics
- `GET /api/venues/:id/forecast` - Get peak time forecast
- `POST /api/venues` - Create venue (operator only)
- `PATCH /api/venues/:id` - Update venue
- `PATCH /api/venues/:id/status` - Update venue status

### Reports
- `POST /api/reports/wait` - Submit wait time report
- `POST /api/reports/vibe` - Submit vibe report
- `GET /api/reports/history` - Get user's report history

### Events
- `GET /api/events` - Get events (with filters)
- `POST /api/events` - Create event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Cancel event

### Alerts
- `GET /api/alerts` - Get user's alert subscriptions
- `POST /api/alerts` - Create alert subscription
- `PATCH /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

## Features Implemented

### Alpha Features
- ✅ User authentication (JWT)
- ✅ Venue list view with location data
- ✅ Basic wait time reporting
- ✅ Database setup (MongoDB)
- ✅ Map view (simplified without Google Maps API key)

### Beta Features
- ✅ Real-time feed of updates (Socket.io)
- ✅ Venue profiles with current metrics
- ✅ Crowd density reporting
- ✅ Vibe level reporting (noise, energy, music)
- ✅ Geofence verification
- ✅ User profile and contribution history

### Additional Features
- ✅ Alert/notification infrastructure
- ✅ Peak time forecasting
- ✅ Data aggregation (30-min windows)
- ✅ Anonymous reporting support
- ✅ Real-time venue updates via WebSocket

## Key Concepts

### 1. User
Identifies patrons and venue operators with minimal identity for privacy

### 2. Venue
Represents nightlife locations with operator-controllable status

### 3. VenueEvent
Describes events occurring at venues (trivia, live music, etc.)

### 4. WaitReport
Crowdsourced wait times with geofence verification

### 5. VibeReport
Structured atmosphere data (crowd, noise, energy, music)

### 6. AlertSubscription
User notifications when venue conditions match preferences

### 7. VenueStatsSnapshot
Historical data for forecasting peak times

## Privacy & Ethics

- **No reputation scores** - full anonymity/pseudonyms allowed
- **Geofence verification** - prevents spoofing (100m radius)
- **Aggregated data only** - operators see statistics, not raw user data
- **Structured categories** - reduces harmful descriptors
- **One report per venue per 3 hours** - spam prevention

## Testing

After running the seed script, you'll have 25+ Boston venues available for testing. You can register a new account or use any test credentials you create.

## Development Workflow

1. Make sure MongoDB is accessible
2. Start backend server: `cd server && npm run dev`
3. Start frontend: `cd waitless-frontend && npm start`
4. Navigate to `http://localhost:3000`
5. Login or register
6. Allow location access when prompted
7. Explore nearby venues (seed data includes Boston area venues)

## Troubleshooting

### Location Not Working
- Ensure browser has location permissions enabled
- Must use HTTPS in production (HTTP works for localhost)

### No Venues Showing
- Run the seed script to populate venues: `cd server && npm run seed`
- Verify MongoDB connection
- Check browser console for errors

### Real-time Updates Not Working
- Ensure Socket.io connection is established (check browser console)
- Verify `CLIENT_URL` in backend `.env` matches frontend URL

### Geofence Verification Failing
- Default radius is 100 meters
- Adjust `GEOFENCE_RADIUS_METERS` in `.env` for testing

## Future Enhancements

- Google Maps integration (requires API key)
- Push notifications (service workers)
- Advanced filtering options
- Heatmap visualization
- Venue operator dashboard
- Event creation UI
- Mobile app (React Native)

## Resources

- [Implementation Plan](./PLAN.md)
- [Development Plan](./waitless-backend/developmentplan.md)
- [Project Framing](./waitless-backend/projectframing.md)
- [Concept Design](./waitless-backend/conceptdesign.md)
- [Design Summary](./waitless-backend/designsummary.md)

##Alpha Video
[Video](https://github.com/Saloushe12/61040-chore-app/blob/main/Screen%20Recording%202025-11-25%20at%2011.54.15%20PM.mov)

## License

MIT

[Final Design Summary](./waitless-backend/designsummaryfinal.md)

[Reflections](./waitless-backend/reflection.md)

[Final Video](https://streamable.com/cb5vv7)