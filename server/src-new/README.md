# src-new: Concept-Based Architecture

This directory contains the refactored backend using a **concept-based architecture** with raw MongoDB instead of Mongoose.

## Architecture Overview

### Concepts (7 total)
All concepts are implemented as classes with explicit actions and state:

1. **UserConcept** - User registration, authentication, profile management
2. **VenueConcept** - Venue creation, claiming, profile/status updates
3. **VenueEventConcept** - Event creation, updates, cancellation
4. **WaitReportConcept** - Wait time report submission (user & operator)
5. **VibeReportConcept** - Atmosphere/vibe report submission
6. **AlertSubscriptionConcept** - Alert subscription management
7. **VenueStatsSnapshotConcept** - Historical stats snapshots for forecasting

### Synchronizations (8 total)
Syncs coordinate actions between multiple concepts:

1. **NearbyVenuesSync** - Get nearby venues with aggregated metrics
2. **VenueDetailSync** - Get venue details with live metrics, events, forecast
3. **EventFilterSync** - Filter events by tags and time range
4. **HeatmapSync** - Calculate activity scores per grid cell
5. **UserAlertsSync** - Get user's alert subscriptions
6. **PeakForecastSync** - Get predicted peak hours based on snapshots
7. **VenueDashboardSync** - Get operator's managed venues with stats
8. **UserContributionHistorySync** - Get user's wait and vibe reports

## Key Differences from `src`

- **Raw MongoDB**: Uses `mongodb` driver directly instead of Mongoose
- **Concept-Based**: Business logic organized into independent concept classes
- **Sync-Based**: Higher-level features implemented as syncs that coordinate concepts
- **Standalone**: No dependencies on `src` directory

## Running src-new

### Prerequisites
- Node.js installed
- MongoDB running (local or cloud)
- Environment variables configured (see `.env` file)

### Start the Server

```bash
# From the server directory
npm run dev:new
```

Or manually:
```bash
node src-new/server.js
```

### Environment Variables

Required variables (same as `src`):
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `GEOFENCE_RADIUS_METERS` - Geofence verification radius (default: 100)

## Testing

The server runs on the same port as `src` (default: 5000). To test both simultaneously, you can:

1. **Run src-new on a different port**: Set `PORT=5001` in your `.env` file
2. **Test endpoints**: All API endpoints are the same as `src`:
   - `GET /api/venues` - Get nearby venues
   - `GET /api/venues/:id` - Get venue details
   - `POST /api/reports/wait` - Submit wait report
   - `POST /api/reports/vibe` - Submit vibe report
   - etc.

## Database Collections

The concept-based architecture uses these collection names:
- `User.users`
- `Venue.venues`
- `VenueEvent.events`
- `WaitReport.reports`
- `VibeReport.reports`
- `AlertSubscription.subscriptions`
- `VenueStatsSnapshot.snapshots`

**Note**: These are different from Mongoose collection names. If you want to use existing data, you may need to migrate or adjust collection names in the concept files.

## API Compatibility

The `src-new` routes maintain the same HTTP request/response contracts as `src`, so the frontend should work without changes. The main difference is internal architecture:

- **src**: Routes → Mongoose Models → Database
- **src-new**: Routes → Concepts/Syncs → Raw MongoDB → Database

