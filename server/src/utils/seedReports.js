// Seed script to populate database with sample reports for all venues
require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');
const User = require('../models/User');

// Helper to add small random offset to coordinates (within ~50 meters)
const addRandomOffset = (coord, offsetMeters = 50) => {
  // Rough conversion: 1 degree latitude ≈ 111km, so 1 meter ≈ 0.000009 degrees
  const offsetDegrees = (Math.random() * offsetMeters * 2 - offsetMeters) * 0.000009;
  return coord + offsetDegrees;
};

// Helper to get random element from array
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random integer between min and max (inclusive)
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedReports = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Get or create a test user for reports
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      // Create a test user if doesn't exist (password will be hashed by pre-save hook)
      testUser = new User({
        email: 'test@example.com',
        passwordHash: 'password123', // Will be hashed by pre-save hook
        displayName: 'Test User',
        role: 'patron'
      });
      await testUser.save();
      console.log('Created test user for reports');
    }

    // Get all venues
    const venues = await Venue.find({});
    console.log(`Found ${venues.length} venues`);

    if (venues.length === 0) {
      console.log('No venues found. Please seed venues first using seed.js');
      process.exit(1);
    }

    // Clear existing reports (optional - comment out if you want to keep existing reports)
    await WaitReport.deleteMany({});
    await VibeReport.deleteMany({});
    console.log('Cleared existing reports');

    const waitTimeOptions = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120]; // minutes
    const crowdDensityOptions = ['low', 'medium', 'high'];
    const noiseLevelOptions = ['chill', 'moderate', 'loud'];
    const energyLevelOptions = ['low', 'medium', 'hype'];
    const musicTagOptions = [
      ['edm', 'dj'],
      ['hip_hop', 'dj'],
      ['jazz', 'live_band'],
      ['rock', 'live_band'],
      ['pop', 'dj'],
      ['latin', 'dj'],
      ['edm'],
      ['hip_hop'],
      ['jazz'],
      ['rock'],
      ['pop'],
      ['live_band'],
      ['dj'],
      ['none']
    ];

    let totalWaitReports = 0;
    let totalVibeReports = 0;

    // For each venue, create 5 wait reports and 5 vibe reports
    for (const venue of venues) {
      const venueLng = venue.location.coordinates[0];
      const venueLat = venue.location.coordinates[1];

      // Create 5 wait reports (within last 30 minutes, spread out)
      for (let i = 0; i < 5; i++) {
        // Random time within last 30 minutes
        const minutesAgo = Math.random() * 30;
        const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);

        // Random wait time (weighted toward lower times for realism)
        const reportedWaitMinutes = randomElement(waitTimeOptions);

        // Location slightly offset from venue (within ~50m, ensuring geofence verified)
        const reportLng = addRandomOffset(venueLng, 30);
        const reportLat = addRandomOffset(venueLat, 30);

        const waitReport = new WaitReport({
          venueId: venue._id,
          userId: testUser._id,
          reportedWaitMinutes,
          geofenceVerified: true, // We're placing reports close to venue
          location: {
            type: 'Point',
            coordinates: [reportLng, reportLat]
          },
          createdAt,
          source: 'user'
        });

        await waitReport.save();
        totalWaitReports++;
      }

      // Create 5 vibe reports (within last 30 minutes, spread out)
      for (let i = 0; i < 5; i++) {
        // Random time within last 30 minutes
        const minutesAgo = Math.random() * 30;
        const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);

        // Random vibe attributes
        const crowdDensity = randomElement(crowdDensityOptions);
        const noiseLevel = randomElement(noiseLevelOptions);
        const energyLevel = randomElement(energyLevelOptions);
        const musicTags = randomElement(musicTagOptions);

        // Location slightly offset from venue (within ~50m, ensuring geofence verified)
        const reportLng = addRandomOffset(venueLng, 30);
        const reportLat = addRandomOffset(venueLat, 30);

        const vibeReport = new VibeReport({
          venueId: venue._id,
          userId: testUser._id,
          crowdDensity,
          noiseLevel,
          energyLevel,
          musicTags,
          geofenceVerified: true, // We're placing reports close to venue
          location: {
            type: 'Point',
            coordinates: [reportLng, reportLat]
          },
          createdAt
        });

        await vibeReport.save();
        totalVibeReports++;
      }

      console.log(`✓ Created 5 wait reports and 5 vibe reports for ${venue.name}`);
    }

    console.log(`\n✅ Database seeding completed!`);
    console.log(`   Total wait reports: ${totalWaitReports}`);
    console.log(`   Total vibe reports: ${totalVibeReports}`);
    console.log(`   All reports are geofence verified and within the last 30 minutes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reports:', error);
    process.exit(1);
  }
};

seedReports();

