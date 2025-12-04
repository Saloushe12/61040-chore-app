# Environment Variables Setup Guide

This document lists all required environment variables for the WaitLess application.

## Backend Environment Variables (`server/.env`)

Create a `.env` file in the `server/` directory with the following variables:

### Required Variables

#### 1. **MONGODB_URI** (Required)
- **Description**: MongoDB connection string
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/waitless`
- **How to get it**:
  - See `MONGODB_SETUP.md` for creating your own cluster
  - See `MONGODB_TEAM_ACCESS.md` if using a teammate's cluster
  - In MongoDB Atlas: Database → Connect → "Connect your application"
  - Replace `<username>` and `<password>` with your database user credentials
- **Example**: `mongodb+srv://waitless-admin:MyPassword123@cluster0.xxxxx.mongodb.net/waitless?retryWrites=true&w=majority`

#### 2. **JWT_SECRET** (Required)
- **Description**: Secret key for signing JSON Web Tokens (authentication)
- **Format**: Any long, random string
- **How to generate**: 
  - Use a random string generator
  - Or run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Security**: Keep this secret! Don't commit to git.

### Optional Variables (with defaults)

#### 3. **PORT** (Optional, default: 5000)
- **Description**: Port number for the backend server
- **Default**: `5000`
- **Example**: `5000`

#### 4. **CLIENT_URL** (Optional, default: http://localhost:3000)
- **Description**: Frontend URL for CORS and Socket.io
- **Default**: `http://localhost:3000`
- **Example**: `http://localhost:3000`

#### 5. **GEOFENCE_RADIUS_METERS** (Optional, default: 100)
- **Description**: Maximum distance (in meters) from venue for geofence verification
- **Default**: `100`
- **Example**: `100`

#### 6. **NODE_ENV** (Optional)
- **Description**: Environment mode (development, production, test)
- **Default**: `development`
- **Example**: `development`

---

## Frontend Environment Variables (`waitless-frontend/.env`)

Create a `.env` file in the `waitless-frontend/` directory with the following variables:

### Required Variables

#### 1. **REACT_APP_API_URL** (Required)
- **Description**: Backend API base URL
- **Format**: `http://localhost:PORT/api` or `https://your-backend-url.com/api`
- **Default**: `http://localhost:5000/api` (if not set)
- **Example**: `http://localhost:5000/api`

### Optional Variables

#### 2. **REACT_APP_GOOGLE_MAPS_API_KEY** (Optional)
- **Description**: Google Maps API key for map features
- **Format**: Google Maps API key string
- **How to get it**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select existing
  3. Enable "Maps JavaScript API"
  4. Go to "Credentials" → "Create Credentials" → "API Key"
  5. Copy the API key
- **Note**: If not set, Google Maps features will be disabled (app will still work with SimpleMap)
- **Example**: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Complete `.env` File Examples

### Backend (`server/.env`)
```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/waitless
JWT_SECRET=your_secret_key_here_make_it_long_and_random

# Optional (with defaults)
PORT=5000
CLIENT_URL=http://localhost:3000
GEOFENCE_RADIUS_METERS=100
NODE_ENV=development
```

### Frontend (`waitless-frontend/.env`)
```env
# Required
REACT_APP_API_URL=http://localhost:5000/api

# Optional
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## Setup Checklist

### Backend Setup
- [ ] Create `server/.env` file
- [ ] Set `MONGODB_URI` (get from MongoDB Atlas)
- [ ] Set `JWT_SECRET` (generate a random string)
- [ ] (Optional) Set `PORT` if you want a different port
- [ ] (Optional) Set `CLIENT_URL` if frontend runs on different port
- [ ] (Optional) Set `GEOFENCE_RADIUS_METERS` if you want different radius

### Frontend Setup
- [ ] Create `waitless-frontend/.env` file
- [ ] Set `REACT_APP_API_URL` (should match backend PORT)
- [ ] (Optional) Set `REACT_APP_GOOGLE_MAPS_API_KEY` for map features

### MongoDB Setup
- [ ] Create MongoDB Atlas account (or get invited to team project)
- [ ] Create database user
- [ ] Whitelist your IP address
- [ ] Get connection string
- [ ] Test connection

---

## Security Notes

1. **Never commit `.env` files to git** - They contain secrets!
2. **`.env` files should be in `.gitignore`** (check that they are)
3. **JWT_SECRET** should be long and random (at least 32 characters)
4. **MONGODB_URI** contains username and password - keep it secret
5. **For production**: Use environment variables set by your hosting provider, not `.env` files

---

## Testing Your Setup

### Test Backend Connection
```bash
cd server
npm install
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('✅ MongoDB connected!'); process.exit(0); }).catch(err => { console.error('❌ Error:', err.message); process.exit(1); });"
```

### Test Frontend Environment
```bash
cd waitless-frontend
npm install
npm start
# Check browser console for any API connection errors
```

---

## Troubleshooting

### MongoDB Connection Issues
- **Error: "authentication failed"**: Check username/password in MONGODB_URI
- **Error: "connection timeout"**: Check IP whitelist in MongoDB Atlas
- **Error: "cluster not found"**: Check cluster name in connection string

### JWT Issues
- **Error: "jwt malformed"**: Check JWT_SECRET is set correctly
- **Error: "invalid signature"**: JWT_SECRET changed - users need to re-login

### Frontend API Issues
- **Error: "Network Error"**: Check REACT_APP_API_URL matches backend PORT
- **Error: "CORS error"**: Check CLIENT_URL in backend matches frontend URL

---

## Quick Start (Minimal Setup)

If you just want to get started quickly:

1. **Backend**: Create `server/.env` with:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=any_long_random_string_here
   ```

2. **Frontend**: Create `waitless-frontend/.env` with:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

That's it! The other variables have sensible defaults.


