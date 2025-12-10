// Comprehensive seed script to populate database with realistic dummy data
// Simulates real usage with users, venues, reports, events, alerts, and snapshots
require('dotenv').config({ path: './.env' });
const connectDB = require('../config/db');
const { setDb } = require('../utils/database');

const UserConcept = require('../concepts/UserConcept');
const VenueConcept = require('../concepts/VenueConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const VenueEventConcept = require('../concepts/VenueEventConcept');
const AlertSubscriptionConcept = require('../concepts/AlertSubscriptionConcept');
const VenueStatsSnapshotConcept = require('../concepts/VenueStatsSnapshotConcept');
const { freshID, ObjectId } = require('../utils/database');

// Helper function to get random element from array
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate date N hours ago
const hoursAgo = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

// Generate date N days ago
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const seedFullDatabase = async () => {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');
    console.log('⚠️  WARNING: This will DELETE all existing seed data and recreate it.\n');

    // Connect to database
    const db = await connectDB();
    setDb(db);
    console.log('✅ Connected to MongoDB\n');

    // Initialize concepts
    const userConcept = new UserConcept(db);
    const venueConcept = new VenueConcept(db);
    const waitReportConcept = new WaitReportConcept(db);
    const vibeReportConcept = new VibeReportConcept(db);
    const venueEventConcept = new VenueEventConcept(db);
    const alertSubscriptionConcept = new AlertSubscriptionConcept(db);
    const snapshotConcept = new VenueStatsSnapshotConcept(db);

    // ============================================
    // 0. DELETE EXISTING SEED DATA
    // ============================================
    console.log('🗑️  Deleting existing seed data...');
    
    // Delete test users (users with @example.com emails)
    // First get their IDs before deleting to clear venue assignments
    const usersCollection = await userConcept._users();
    const testUsers = await usersCollection.find({ email: { $regex: /@example\.com$/ } }).toArray();
    const testUserIds = testUsers.map(u => u._id);
    
    const deleteUsersResult = await usersCollection.deleteMany({ email: { $regex: /@example\.com$/ } });
    console.log(`  ✓ Deleted ${deleteUsersResult.deletedCount} test users`);

    // Delete all wait reports
    const waitReportsCollection = await waitReportConcept._reports();
    const deleteWaitReportsResult = await waitReportsCollection.deleteMany({});
    console.log(`  ✓ Deleted ${deleteWaitReportsResult.deletedCount} wait reports`);

    // Delete all vibe reports
    const vibeReportsCollection = await vibeReportConcept._reports();
    const deleteVibeReportsResult = await vibeReportsCollection.deleteMany({});
    console.log(`  ✓ Deleted ${deleteVibeReportsResult.deletedCount} vibe reports`);

    // Delete all events
    const eventsCollection = await venueEventConcept._events();
    const deleteEventsResult = await eventsCollection.deleteMany({});
    console.log(`  ✓ Deleted ${deleteEventsResult.deletedCount} events`);

    // Delete all alert subscriptions
    const alertsCollection = await alertSubscriptionConcept._subs();
    const deleteAlertsResult = await alertsCollection.deleteMany({});
    console.log(`  ✓ Deleted ${deleteAlertsResult.deletedCount} alert subscriptions`);

    // Delete all snapshots
    const snapshotsCollection = await snapshotConcept._snapshots();
    const deleteSnapshotsResult = await snapshotsCollection.deleteMany({});
    console.log(`  ✓ Deleted ${deleteSnapshotsResult.deletedCount} snapshots`);

    // Clear operator assignments from venues (set operatorUserId to null for deleted test operators)
    const venuesCollection = await venueConcept._venues();
    
    if (testUserIds.length > 0) {
      const clearOperatorResult = await venuesCollection.updateMany(
        { operatorUserId: { $in: testUserIds } },
        { $set: { operatorUserId: null } }
      );
      console.log(`  ✓ Cleared operator assignments from ${clearOperatorResult.modifiedCount} venues`);
    }
    
    console.log('✅ Cleanup complete\n');

    // ============================================
    // 1. CREATE USERS
    // ============================================
    console.log('👥 Creating users...');
    const users = [];
    const userNames = [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
      'Sam', 'Dakota', 'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Hayden',
      'Jamie', 'Kai', 'Logan', 'Noah', 'Parker', 'Reese', 'River', 'Sage'
    ];

    // Create 20 patrons
    for (let i = 0; i < 20; i++) {
      const name = userNames[i % userNames.length];
      const email = `user${i + 1}@example.com`;
      const result = await userConcept.register({
        email,
        password: 'password123',
        displayName: `${name}${i > 0 ? i : ''}`,
        role: 'patron'
      });
      if (!result.error) {
        users.push({ id: result.userId, role: 'patron', email });
        console.log(`  ✓ Created patron: ${email}`);
      } else {
        console.log(`  ⚠ Skipped patron ${email}: ${result.error}`);
      }
    }

    // Create 5 venue operators
    for (let i = 0; i < 5; i++) {
      const email = `operator${i + 1}@example.com`;
      const result = await userConcept.register({
        email,
        password: 'password123',
        displayName: `Operator ${i + 1}`,
        role: 'venue_operator'
      });
      if (!result.error) {
        users.push({ id: result.userId, role: 'venue_operator', email });
        console.log(`  ✓ Created operator: ${email}`);
      } else {
        console.log(`  ⚠ Skipped operator ${email}: ${result.error}`);
      }
    }

    if (users.length === 0) {
      console.error('❌ No users were created. Cannot continue seeding.');
      process.exit(1);
    }

    console.log(`✅ Created ${users.length} users\n`);

    // ============================================
    // 2. GET OR CREATE VENUES
    // ============================================
    console.log('🏢 Getting venues...');
    let venues = await venuesCollection.find({}).toArray();
    
    if (venues.length === 0) {
      console.log('  No venues found, creating sample venues...');
      // Create a few sample venues in Boston area
      const sampleVenues = [
        {
          name: 'The Night Owl',
          location: { lat: 42.3601, lon: -71.0589 },
          address: '123 Main St, Boston, MA 02101',
          hours: {
            monday: { open: '17:00', close: '02:00' },
            tuesday: { open: '17:00', close: '02:00' },
            wednesday: { open: '17:00', close: '02:00' },
            thursday: { open: '17:00', close: '02:00' },
            friday: { open: '17:00', close: '02:00' },
            saturday: { open: '17:00', close: '02:00' },
            sunday: { open: '17:00', close: '01:00' }
          },
          tags: ['bar', 'club', 'dance'],
          staticAttributes: { coverCharge: 10, minAge: 21, capacity: 300 }
        },
        {
          name: 'Jazz Lounge',
          location: { lat: 42.3503, lon: -71.0750 },
          address: '456 Music Ave, Boston, MA 02116',
          hours: {
            monday: { open: '18:00', close: '01:00' },
            tuesday: { open: '18:00', close: '01:00' },
            wednesday: { open: '18:00', close: '01:00' },
            thursday: { open: '18:00', close: '02:00' },
            friday: { open: '18:00', close: '02:00' },
            saturday: { open: '18:00', close: '02:00' },
            sunday: { open: '18:00', close: '01:00' }
          },
          tags: ['bar', 'live_music', 'jazz'],
          staticAttributes: { coverCharge: 15, minAge: 21, capacity: 150 }
        },
        {
          name: 'Sports Bar Central',
          location: { lat: 42.3487, lon: -71.0815 },
          address: '789 Game St, Boston, MA 02115',
          hours: {
            monday: { open: '11:00', close: '02:00' },
            tuesday: { open: '11:00', close: '02:00' },
            wednesday: { open: '11:00', close: '02:00' },
            thursday: { open: '11:00', close: '02:00' },
            friday: { open: '11:00', close: '02:00' },
            saturday: { open: '11:00', close: '02:00' },
            sunday: { open: '11:00', close: '02:00' }
          },
          tags: ['bar', 'sports_bar', 'restaurant'],
          staticAttributes: { coverCharge: 0, minAge: 21, capacity: 250 }
        }
      ];

      for (const venueData of sampleVenues) {
        const result = await venueConcept.createVenue(venueData);
        if (!result.error) {
          console.log(`  ✓ Created venue: ${venueData.name}`);
        }
      }
      venues = await venuesCollection.find({}).toArray();
    }

    console.log(`✅ Working with ${venues.length} venues\n`);

    // ============================================
    // 3. CREATE WAIT REPORTS (past 2 weeks)
    // ============================================
    console.log('⏱️  Creating wait reports...');
    let waitReportCount = 0;
    const patrons = users.filter(u => u.role === 'patron');

      for (const venue of venues) {
        // Create 5-15 reports per venue over the past 2 weeks
        const reportCount = randomInt(5, 15);
        
        for (let i = 0; i < reportCount; i++) {
          const user = random(patrons);
          if (!user || !user.id) {
            console.log('  ⚠ Skipping report: invalid user');
            continue;
          }
          const daysBack = randomInt(0, 14);
        const hoursBack = randomInt(0, 23);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysBack);
        timestamp.setHours(timestamp.getHours() - hoursBack);
        timestamp.setMinutes(randomInt(0, 59));

        // Wait times vary by time of day (higher in evening)
        let waitMinutes;
        const hour = timestamp.getHours();
        if (hour >= 21 || hour < 2) {
          waitMinutes = randomInt(15, 45); // Peak hours
        } else if (hour >= 18) {
          waitMinutes = randomInt(5, 25); // Evening
        } else {
          waitMinutes = randomInt(0, 10); // Daytime
        }

        // Add slight random variation to venue location for geofence
        const venueLat = venue.location.lat;
        const venueLon = venue.location.lon;
        const offset = 0.001; // ~100m
        const location = {
          lat: venueLat + randomFloat(-offset, offset),
          lon: venueLon + randomFloat(-offset, offset)
        };

        // Insert directly with custom timestamp
        const reports = await waitReportConcept._reports();
        const reportId = freshID();
        
        await reports.insertOne({
          _id: new ObjectId(reportId),
          venueId: venue._id,
          userId: new ObjectId(user.id),
          reportedWaitMinutes: waitMinutes,
          createdAt: timestamp,
          source: 'user',
          geofenceVerified: true,
          location
        });

        waitReportCount++;
      }
    }

    console.log(`✅ Created ${waitReportCount} wait reports\n`);

    // ============================================
    // 4. CREATE VIBE REPORTS (past 2 weeks)
    // ============================================
    console.log('🎵 Creating vibe reports...');
    let vibeReportCount = 0;

      for (const venue of venues) {
        // Create 8-20 vibe reports per venue
        const reportCount = randomInt(8, 20);
        
        for (let i = 0; i < reportCount; i++) {
          const user = random(patrons);
          if (!user || !user.id) {
            console.log('  ⚠ Skipping report: invalid user');
            continue;
          }
          const daysBack = randomInt(0, 14);
        const hoursBack = randomInt(0, 23);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysBack);
        timestamp.setHours(timestamp.getHours() - hoursBack);
        timestamp.setMinutes(randomInt(0, 59));

        // Crowd density varies by time (higher in evening/weekend)
        const hour = timestamp.getHours();
        const dayOfWeek = timestamp.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        const isPeak = (hour >= 21 || hour < 2) && isWeekend;

        const crowdDensity = isPeak ? random(['medium', 'high']) : random(['low', 'medium', 'high']);
        const noiseLevel = random(['chill', 'moderate', 'loud']);
        const energyLevel = isPeak ? random(['medium', 'hype']) : random(['low', 'medium', 'hype']);
        
        const musicTags = [];
        const allTags = ['edm', 'hip_hop', 'jazz', 'rock', 'pop', 'country', 'latin', 'live_band', 'dj'];
        const tagCount = randomInt(1, 3);
        for (let j = 0; j < tagCount; j++) {
          const tag = random(allTags);
          if (!musicTags.includes(tag)) {
            musicTags.push(tag);
          }
        }

        const venueLat = venue.location.lat;
        const venueLon = venue.location.lon;
        const offset = 0.001;
        const location = {
          lat: venueLat + randomFloat(-offset, offset),
          lon: venueLon + randomFloat(-offset, offset)
        };

        // Insert directly with custom timestamp
        const reports = await vibeReportConcept._reports();
        const reportId = freshID();
        
        await reports.insertOne({
          _id: new ObjectId(reportId),
          venueId: venue._id,
          userId: new ObjectId(user.id),
          crowdDensity,
          noiseLevel,
          energyLevel,
          musicTags,
          createdAt: timestamp,
          geofenceVerified: true,
          location
        });

        vibeReportCount++;
      }
    }

    console.log(`✅ Created ${vibeReportCount} vibe reports\n`);

    // ============================================
    // 5. CREATE EVENTS (upcoming and past)
    // ============================================
    console.log('📅 Creating events...');
    let eventCount = 0;
    const operators = users.filter(u => u.role === 'venue_operator');
    const eventTitles = [
      'Trivia Night', 'Live Jazz', 'DJ Set', 'Karaoke Night', 'Comedy Show',
      'Latin Night', 'Rock Band', 'Hip Hop Night', 'EDM Party', 'Open Mic',
      'Sports Watch Party', 'Dance Night', 'Rooftop Party', 'Acoustic Session'
    ];

    if (operators.length === 0) {
      console.log('  ⚠ No operators found, skipping events');
    } else {
      for (const venue of venues) {
      // Create 2-5 upcoming events
      const upcomingCount = randomInt(2, 5);
      for (let i = 0; i < upcomingCount; i++) {
        const daysAhead = randomInt(0, 14);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + daysAhead);
        startTime.setHours(randomInt(19, 22), randomInt(0, 59));

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + randomInt(2, 4));

        const title = random(eventTitles);
        const tags = [random(['trivia', 'live_music', 'dj', 'karaoke', 'comedy', 'sports', 'dance'])];

        const operator = random(operators);
        const result = await venueEventConcept.createVenueEvent({
          venueId: venue._id.toHexString(),
          title,
          description: `Join us for ${title.toLowerCase()}!`,
          timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
          tags,
          createdByUserId: operator.id
        });

        if (!result.error) {
          eventCount++;
        }
      }

      // Create 3-8 past events
      const pastCount = randomInt(3, 8);
      for (let i = 0; i < pastCount; i++) {
        const daysBack = randomInt(1, 30);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysBack);
        startTime.setHours(randomInt(19, 22), randomInt(0, 59));

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + randomInt(2, 4));

        const title = random(eventTitles);
        const tags = [random(['trivia', 'live_music', 'dj', 'karaoke', 'comedy', 'sports', 'dance'])];

        const operator = random(operators);
        const result = await venueEventConcept.createVenueEvent({
          venueId: venue._id.toHexString(),
          title,
          description: `Join us for ${title.toLowerCase()}!`,
          timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
          tags,
          createdByUserId: operator.id
        });

        if (!result.error) {
          eventCount++;
        }
      }
    }
    }

    console.log(`✅ Created ${eventCount} events\n`);

    // ============================================
    // 6. CREATE ALERT SUBSCRIPTIONS
    // ============================================
    console.log('🔔 Creating alert subscriptions...');
    let alertCount = 0;

    if (patrons.length === 0) {
      console.log('  ⚠ No patrons found, skipping alert subscriptions');
    } else {
      for (const user of patrons.slice(0, Math.min(10, patrons.length))) { // First 10 patrons get alerts
        const venue = random(venues);
      const condition = {};

      // Randomly add conditions
      if (Math.random() > 0.3) {
        condition.waitBelowMinutes = randomInt(10, 30);
      }
      if (Math.random() > 0.5) {
        condition.crowdDensityIn = [random(['low', 'medium', 'high'])];
      }
      if (Math.random() > 0.7) {
        condition.eventTag = random(['trivia', 'live_music', 'dj', 'karaoke']);
      }

        const result = await alertSubscriptionConcept.createAlertSubscription({
          userId: user.id,
          venueId: venue._id.toHexString(),
          condition
        });

        if (!result.error) {
          alertCount++;
        }
      }
    }

    console.log(`✅ Created ${alertCount} alert subscriptions\n`);

    // ============================================
    // 7. CREATE HISTORICAL SNAPSHOTS (past 2 days, hourly)
    // ============================================
    console.log('📊 Creating historical snapshots...');
    let snapshotCount = 0;

    for (const venue of venues) {
      // Create snapshots every hour for the past 2 days (much faster than every 15 min for 7 days)
      const now = new Date();
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      let currentTime = new Date(twoDaysAgo);
      currentTime.setMinutes(0, 0, 0); // Round to start of hour

      while (currentTime < now) {
        const hour = currentTime.getHours();
        const dayOfWeek = currentTime.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        const isPeak = (hour >= 21 || hour < 2) && isWeekend;

        // Generate realistic metrics based on time
        const avgWait = isPeak ? randomInt(20, 40) : (hour >= 18 ? randomInt(5, 20) : randomInt(0, 10));
        const crowdDensityNum = isPeak ? randomInt(1, 2) : (hour >= 18 ? randomInt(0, 1) : 0);
        const reportCount = isPeak ? randomInt(3, 8) : randomInt(0, 3);

        // Calculate peak score (0-100)
        const waitScore = Math.min(avgWait * 2, 50);
        const crowdScore = crowdDensityNum * 25;
        const derivedPeakScore = Math.round(waitScore + crowdScore);

        await snapshotConcept.recordStatsSnapshot({
          venueId: venue._id.toHexString(),
          aggregates: {
            avgReportedWait: avgWait,
            avgCrowdDensity: crowdDensityNum,
            reportCount,
            derivedPeakScore
          },
          timestamp: new Date(currentTime)
        });

        snapshotCount++;
        currentTime.setHours(currentTime.getHours() + 1); // Move to next hour
      }
    }

    console.log(`✅ Created ${snapshotCount} historical snapshots\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('🎉 Seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Users: ${users.length} (${patrons.length} patrons, ${operators.length} operators)`);
    console.log(`  - Venues: ${venues.length}`);
    console.log(`  - Wait Reports: ${waitReportCount}`);
    console.log(`  - Vibe Reports: ${vibeReportCount}`);
    console.log(`  - Events: ${eventCount}`);
    console.log(`  - Alert Subscriptions: ${alertCount}`);
    console.log(`  - Historical Snapshots: ${snapshotCount}\n`);
    console.log('💡 Test accounts:');
    console.log('  Patrons: user1@example.com - user20@example.com (password: password123)');
    console.log('  Operators: operator1@example.com - operator5@example.com (password: password123)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
};

seedFullDatabase();

