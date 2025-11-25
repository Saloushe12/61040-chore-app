// Seed script to populate database with sample venues
require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const User = require('../models/User');

const sampleVenues = [
  {
    name: 'The Blue Note Jazz Club',
    location: {
      type: 'Point',
      coordinates: [-71.0923, 42.3497] // Cambridge, MA
    },
    address: '123 Jazz St, Cambridge, MA 02139',
    hours: {
      monday: { open: '18:00', close: '02:00' },
      tuesday: { open: '18:00', close: '02:00' },
      wednesday: { open: '18:00', close: '02:00' },
      thursday: { open: '18:00', close: '02:00' },
      friday: { open: '18:00', close: '03:00' },
      saturday: { open: '18:00', close: '03:00' },
      sunday: { open: '18:00', close: '01:00' }
    },
    tags: ['bar', 'club', 'lounge'],
    currentStatus: 'open',
    staticAttributes: {
      coverCharge: 10,
      accessibility: true,
      minAge: 21,
      capacity: 200
    }
  },
  {
    name: 'Grendel\'s Den',
    location: {
      type: 'Point',
      coordinates: [-71.1199, 42.3736]
    },
    address: '89 Winthrop St, Cambridge, MA 02138',
    hours: {
      monday: { open: '11:00', close: '01:00' },
      tuesday: { open: '11:00', close: '01:00' },
      wednesday: { open: '11:00', close: '01:00' },
      thursday: { open: '11:00', close: '01:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '01:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 150
    }
  },
  {
    name: 'The Middle East',
    location: {
      type: 'Point',
      coordinates: [-71.1031, 42.3650]
    },
    address: '472 Massachusetts Ave, Cambridge, MA 02139',
    hours: {
      monday: { open: '17:00', close: '02:00' },
      tuesday: { open: '17:00', close: '02:00' },
      wednesday: { open: '17:00', close: '02:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '02:00' }
    },
    tags: ['club', 'bar'],
    currentStatus: 'open',
    staticAttributes: {
      coverCharge: 15,
      accessibility: true,
      minAge: 21,
      capacity: 300
    }
  },
  {
    name: 'Phoenix Landing',
    location: {
      type: 'Point',
      coordinates: [-71.1041, 42.3643]
    },
    address: '512 Massachusetts Ave, Cambridge, MA 02139',
    hours: {
      monday: { open: '16:00', close: '02:00' },
      tuesday: { open: '16:00', close: '02:00' },
      wednesday: { open: '16:00', close: '02:00' },
      thursday: { open: '16:00', close: '02:00' },
      friday: { open: '16:00', close: '02:00' },
      saturday: { open: '12:00', close: '02:00' },
      sunday: { open: '12:00', close: '02:00' }
    },
    tags: ['club', 'bar'],
    currentStatus: 'open',
    staticAttributes: {
      coverCharge: 5,
      accessibility: true,
      minAge: 21,
      capacity: 250
    }
  },
  {
    name: 'Miracle of Science',
    location: {
      type: 'Point',
      coordinates: [-71.0956, 42.3617]
    },
    address: '321 Massachusetts Ave, Cambridge, MA 02139',
    hours: {
      monday: { open: '11:30', close: '01:00' },
      tuesday: { open: '11:30', close: '01:00' },
      wednesday: { open: '11:30', close: '01:00' },
      thursday: { open: '11:30', close: '01:00' },
      friday: { open: '11:30', close: '02:00' },
      saturday: { open: '11:30', close: '02:00' },
      sunday: { open: '11:30', close: '01:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 100
    }
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing venues (optional, comment out if you want to keep existing data)
    await Venue.deleteMany({});
    console.log('Cleared existing venues');

    // Insert sample venues
    const venues = await Venue.insertMany(sampleVenues);
    console.log(`Inserted ${venues.length} sample venues`);

    // Create a test user (optional)
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (!existingUser) {
      const testUser = new User({
        email: 'test@example.com',
        passwordHash: 'password123', // Will be hashed by pre-save hook
        displayName: 'Test User',
        role: 'patron'
      });
      await testUser.save();
      console.log('Created test user: test@example.com / password123');
    }

    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
