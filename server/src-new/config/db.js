// Database connection for src-new using raw MongoDB driver
// This replaces the Mongoose-based connection in src/config/db.js

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

let client = null;
let dbInstance = null;

const connectDB = async () => {
  try {
    if (dbInstance) {
      return dbInstance;
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    dbInstance = client.db(); // Connect to the database specified in the URI
    console.log(`MongoDB Connected (src-new): ${client.options.srvHost || 'localhost'}`);
    
    return dbInstance;
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1); // stop the server
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
});

module.exports = connectDB;

