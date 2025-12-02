# Using an Existing MongoDB Cluster (Team Setup)

If a teammate already created the MongoDB cluster, you have two options:

---

## Option 1: Get Added to the Project (Recommended)

### What Your Teammate Needs to Do:

1. **Go to MongoDB Atlas** and open the WaitLess project
2. Click **"Project Settings"** (in left sidebar or top menu)
3. Go to **"Access Manager"** tab
4. Click **"Invite to Project"**
5. Enter your email address
6. Set permissions: **"Project Owner"** or **"Project Read/Write"**
7. Click **"Invite to Project"**

### What You Need to Do:

1. **Check your email** for MongoDB Atlas invitation
2. Click the invitation link
3. Create a MongoDB Atlas account (or sign in if you have one)
4. Accept the invitation
5. Go to the project and see the cluster

### Getting Your Connection String:

Once you're in the project:

1. **Create your own database user**:
   - Click **"Database Access"** in left sidebar
   - Click **"Add New Database User"**
   - Username: Your name (e.g., `dylan`)
   - Password: Click "Autogenerate" and **SAVE IT**
   - Database User Privileges: **"Atlas admin"** or **"Read and write to any database"**
   - Click **"Add User"**

2. **Whitelist your IP**:
   - Click **"Network Access"** in left sidebar
   - Click **"Add IP Address"**
   - Click **"Add Current IP Address"** OR **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Click **"Confirm"**

3. **Get connection string**:
   - Click **"Database"** in left sidebar
   - Click **"Connect"** on the cluster
   - Choose **"Connect your application"**
   - Copy the connection string
   - Replace `<username>` with your username (e.g., `dylan`)
   - Replace `<password>` with your password

4. **Update your `.env`**:
   ```env
   MONGODB_URI=mongodb+srv://dylan:your-password@cluster0.xxxxx.mongodb.net/waitless?retryWrites=true&w=majority
   ```

---

## Option 2: Share Database Credentials (Quick but Less Secure)

If your teammate wants to share their credentials directly:

### What Your Teammate Shares With You:

1. **Database username** (not their MongoDB Atlas login!)
2. **Database password**
3. **Connection string** (or cluster URL)

Example:
```
Username: waitless-admin
Password: SecurePass123
Connection String: mongodb+srv://waitless-admin:SecurePass123@cluster0.ab1cd.mongodb.net/waitless?retryWrites=true&w=majority
```

### What You Do:

1. **Get the info** from your teammate (via Slack, Discord, etc.)
2. **Add your IP to whitelist**:
   - Ask your teammate to whitelist your IP, OR
   - If they already allowed "Access from Anywhere" (0.0.0.0/0), you're good!
3. **Update your `.env`**:
   ```env
   MONGODB_URI=mongodb+srv://waitless-admin:SecurePass123@cluster0.ab1cd.mongodb.net/waitless?retryWrites=true&w=majority
   ```

4. **Test the connection**:
   ```bash
   cd server
   npm run dev
   ```

### ⚠️ Important Notes for Option 2:

- **Everyone shares the same database user** - not ideal for tracking who did what
- **If password changes**, everyone needs to update their `.env`
- **Less secure** - credentials might be exposed if someone commits `.env` to git
- **Better for quick testing**, Option 1 is better for team projects

---

## Option 3: Get the Connection String from Teammate

Your teammate can just give you the full connection string ready to use.

### What Your Teammate Does:

1. Go to MongoDB Atlas → Database
2. Click **"Connect"** on the cluster
3. Choose **"Connect your application"**
4. Copy the connection string
5. Replace `<password>` with the actual password
6. Send you the complete string (via secure channel)

### What You Do:

1. **Whitelist your IP** (ask teammate to do this, or they already allow 0.0.0.0/0)
2. **Paste into `.env`**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/waitless?retryWrites=true&w=majority
   ```

---

## How to Tell if It's Working

After updating your `.env` file:

```bash
cd server
npm run dev
```

✅ **Success** - You should see:
```
MongoDB connected successfully
Database indexes created successfully
Server running on port 5000
```

❌ **Failure** - Common errors:

### "bad auth: Authentication failed"
- Username or password is wrong
- Check with your teammate

### "Server selection timed out"
- Your IP is not whitelisted
- Ask teammate to add your IP to Network Access

### "MongooseServerSelectionError"
- Connection string is wrong
- Check format with teammate

---

## Quick Checklist

Ask your teammate for:
- [ ] Connection string OR
- [ ] Database username and password
- [ ] Confirm they whitelisted your IP (or enabled 0.0.0.0/0)

Then:
- [ ] Update `server/.env` with MONGODB_URI
- [ ] Run `cd server && npm run dev`
- [ ] Check console for "MongoDB connected successfully"
- [ ] Run `node src/utils/seed.js` to populate data

---

## Team Best Practices

### DO:
✅ Each team member gets their own database user (Option 1)
✅ Use environment variables (`.env` file)
✅ Keep `.env` in `.gitignore`
✅ Use "Allow Access from Anywhere" (0.0.0.0/0) for development

### DON'T:
❌ Commit `.env` file to git
❌ Share passwords in public channels
❌ Use production credentials for development

---

## Still Having Issues?

1. **Ask your teammate to check**:
   - Is the cluster running? (not paused)
   - Is your IP whitelisted in Network Access?
   - Did they give you the right password?

2. **Verify your connection string format**:
   ```
   mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
   ```

3. **Test with MongoDB Compass** (GUI tool):
   - Download from: https://www.mongodb.com/products/compass
   - Paste connection string
   - Try to connect
   - If Compass can't connect, something is wrong with credentials/IP

4. **Check the `.env` file**:
   ```bash
   cd server
   cat .env
   # Make sure MONGODB_URI has the right connection string
   ```

---

## Example Communication

**Message to your teammate:**

> Hey! Can you add me to the MongoDB project for WaitLess? My email is: [your-email@example.com]
>
> Or if you prefer, can you share:
> - Database username
> - Database password
> - Connection string
>
> And whitelist my IP or enable "Allow Access from Anywhere" in Network Access?
>
> Thanks!

