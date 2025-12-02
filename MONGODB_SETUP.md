# MongoDB Setup Guide for WaitLess

This guide will walk you through setting up MongoDB Atlas (cloud database) for the WaitLess application.

> **📌 Using a teammate's existing cluster?** See **[Team Access Guide](./MONGODB_TEAM_ACCESS.md)** instead!

## Option 1: MongoDB Atlas (Recommended - Free Cloud Database)

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account using:
   - Email and password, OR
   - Sign in with Google
3. Complete the registration process

### Step 2: Create a Project (Recommended)

If you already have a MongoDB Atlas account with existing projects:

1. Click on your **Organization** name in top-left
2. Click **"New Project"**
3. Name it: `WaitLess` or `61040-chore-app`
4. Click **"Next"** → **"Create Project"**

**OR** if you want to use an existing project, just select it from the dropdown.

> **Tip**: Creating a separate project helps keep this app's databases, users, and settings isolated from other projects.

### Step 3: Create a New Cluster

1. Inside your project, click **"Create"** or "Create a deployment"
2. Choose **M0 (Free)** tier
   - This provides 512 MB storage (more than enough for development)
3. Select a **Cloud Provider & Region**:
   - Provider: AWS, Google Cloud, or Azure (doesn't matter much)
   - Region: Choose one closest to you (e.g., `us-east-1` for East Coast)
4. **Cluster Name**: Leave as default or name it `waitless-cluster`
5. Click **"Create Deployment"** (or "Create Cluster")
6. Wait 1-3 minutes for cluster to be created

### Step 4: Create Database User

You'll see a security quickstart screen:

1. **Authentication Method**: Username and Password
2. **Username**: Create a username (e.g., `waitless-admin`)
3. **Password**:
   - Click "Autogenerate Secure Password" and **COPY IT** (you'll need this!)
   - Or create your own strong password
   - **IMPORTANT**: Save this password somewhere safe!
4. Click **"Create User"**

### Step 5: Set Network Access

1. **Where would you like to connect from?**: Choose "My Local Environment"
2. **IP Access List**:
   - Click **"Add My Current IP Address"** (for development)
   - OR for easier development (less secure): Click "Allow Access from Anywhere"
     - This adds `0.0.0.0/0` which allows connections from any IP
     - **Note**: Only use this for development, not production!
3. Click **"Finish and Close"**

### Step 6: Get Connection String

1. Click **"Go to Database"** (or navigate to Database Deployments)
2. Find your cluster and click **"Connect"**
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 5.5 or later
6. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 7: Configure Your Application

1. Open your backend `.env` file:
   ```bash
   cd server
   nano .env  # or use any text editor
   ```

2. Update the `MONGODB_URI` with your connection string:
   ```env
   MONGODB_URI=mongodb+srv://waitless-admin:YOUR_PASSWORD_HERE@cluster0.xxxxx.mongodb.net/waitless?retryWrites=true&w=majority
   ```

   **Important changes:**
   - Replace `<username>` with your database username (e.g., `waitless-admin`)
   - Replace `<password>` with the password you saved earlier
   - Add `/waitless` before the `?` to specify the database name
   - Remove the `<>` brackets

   **Example:**
   ```env
   MONGODB_URI=mongodb+srv://waitless-admin:MySecurePass123@cluster0.ab1cd.mongodb.net/waitless?retryWrites=true&w=majority
   ```

3. Save the file

### Step 8: Test the Connection

1. Start your backend server:
   ```bash
   cd server
   npm run dev
   ```

2. You should see:
   ```
   MongoDB connected successfully
   Database indexes created successfully
   Server running on port 5000
   ```

3. If you see connection errors, check:
   - Username and password are correct
   - IP address is whitelisted
   - Connection string format is correct

### Step 9: Seed the Database

```bash
cd server
node src/utils/seed.js
```

Expected output:
```
Connected to MongoDB
Cleared existing venues
Inserted 5 sample venues
Created test user: test@example.com / password123
Database seeding completed!
```

### Step 10: Verify Data in MongoDB Atlas

1. Go to MongoDB Atlas Dashboard
2. Click **"Browse Collections"** on your cluster
3. You should see:
   - **Database**: `waitless`
   - **Collections**: `users`, `venues`, `waitreports`, `vibereports`, etc.
   - Click on `venues` to see the 5 sample venues
   - Click on `users` to see the test user

---

## Option 2: Local MongoDB (Alternative)

If you prefer running MongoDB locally:

### Install MongoDB Community Edition

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
1. Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install as a Service
5. Install MongoDB Compass (GUI tool)

**Linux (Ubuntu):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Configure for Local MongoDB

Update your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/waitless
```

### Verify Local Installation

```bash
# Check if MongoDB is running
mongosh

# Should connect to MongoDB shell
# Type 'exit' to quit
```

---

## Troubleshooting

### Error: "MongoServerError: bad auth"
**Solution**:
- Username or password is incorrect
- Make sure you're using the database user credentials, not your Atlas account credentials
- Check for special characters in password - they may need URL encoding
  - Example: `p@ssw0rd` should be `p%40ssw0rd`

### Error: "MongooseServerSelectionError: connect ECONNREFUSED"
**Solution**:
- Check your internet connection
- Verify IP is whitelisted in Atlas Network Access
- Try adding `0.0.0.0/0` to whitelist (for development only)

### Error: "MongooseServerSelectionError: Could not connect to any servers"
**Solution**:
- Connection string format is wrong
- Check that you added the database name (e.g., `/waitless`)
- Verify the cluster is running (not paused)

### Password Contains Special Characters
If your password has special characters like `@`, `$`, `#`, etc., you need to URL encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`

Or regenerate password without special characters in Atlas.

### Network Timeout Errors
**Solution**:
- Cluster might be paused (free tier pauses after inactivity)
- Go to Atlas, find your cluster, and click "Resume" if paused
- Check your firewall isn't blocking MongoDB ports

---

## MongoDB Compass (Optional GUI)

MongoDB Compass is a free GUI for viewing and managing your data:

1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Install and open
3. Use the same connection string from your `.env` file
4. Click "Connect"
5. Browse your databases and collections visually

---

## Quick Reference

### Connection String Format
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

### Essential Environment Variables
```env
MONGODB_URI=mongodb+srv://waitless-admin:password@cluster0.xxxxx.mongodb.net/waitless?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_here_at_least_32_chars
PORT=5000
CLIENT_URL=http://localhost:3000
GEOFENCE_RADIUS_METERS=100
```

### Common Commands
```bash
# Start backend server
cd server
npm run dev

# Seed database
cd server
node src/utils/seed.js

# Check MongoDB connection
# Look for "MongoDB connected successfully" in console
```

---

## Security Best Practices

### For Development:
- ✅ Use Atlas free tier
- ✅ Allow access from anywhere (0.0.0.0/0) for convenience
- ✅ Use strong database password
- ✅ Keep `.env` in `.gitignore`

### For Production:
- ⚠️ Restrict IP access to your server's IP only
- ⚠️ Use environment variables (not hardcoded)
- ⚠️ Enable MongoDB audit logging
- ⚠️ Use VPC peering for extra security
- ⚠️ Rotate database passwords regularly

---

## Next Steps

Once MongoDB is set up and running:

1. ✅ Backend server connects successfully
2. ✅ Seed script populates sample data
3. ✅ Start frontend: `cd waitless-frontend && npm start`
4. ✅ Login with test account: `test@example.com` / `password123`
5. ✅ App should show nearby venues (Cambridge, MA area)

---

## Need Help?

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB University (Free Courses)](https://university.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)

If you continue having issues:
1. Check the server console for error messages
2. Verify MongoDB Atlas cluster is not paused
3. Test connection string with MongoDB Compass
4. Check that all dependencies are installed (`npm install`)
