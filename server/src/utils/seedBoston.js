// Comprehensive seed script to populate database with Boston venues and realistic data
require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');
const User = require('../models/User');

// Helper functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Add small random offset to coordinates (within specified meters)
const addRandomOffset = (coord, offsetMeters = 50) => {
  const offsetDegrees = (Math.random() * offsetMeters * 2 - offsetMeters) * 0.000009;
  return coord + offsetDegrees;
};

// Generate random date within last N days
const randomDateInPast = (daysAgo) => {
  const now = Date.now();
  const past = now - (daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past + Math.random() * (now - past));
};

// Generate date at specific time on a specific day (0 = today, 1 = yesterday, etc.)
const dateAtTime = (hours, minutes = 0, daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Boston venues with real locations
const bostonVenues = [
  // Downtown Boston / Financial District
  {
    name: 'The Bell in Hand Tavern',
    location: { type: 'Point', coordinates: [-71.0578, 42.3586] },
    address: '45 Union St, Boston, MA 02108',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['pub', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 180 }
  },
  {
    name: 'Cheers Beacon Hill',
    location: { type: 'Point', coordinates: [-71.0706, 42.3567] },
    address: '84 Beacon St, Boston, MA 02108',
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
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 200 }
  },
  {
    name: 'The Green Dragon Tavern',
    location: { type: 'Point', coordinates: [-71.0556, 42.3603] },
    address: '11 Marshall St, Boston, MA 02108',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['pub', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 150 }
  },
  
  // Faneuil Hall / North End
  {
    name: 'The Black Rose',
    location: { type: 'Point', coordinates: [-71.0561, 42.3608] },
    address: '160 State St, Boston, MA 02109',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['pub', 'bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 250 }
  },
  {
    name: 'The Fours',
    location: { type: 'Point', coordinates: [-71.0553, 42.3612] },
    address: '166 Canal St, Boston, MA 02114',
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
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 300 }
  },
  
  // Back Bay
  {
    name: 'The Pour House',
    location: { type: 'Point', coordinates: [-71.0802, 42.3496] },
    address: '907 Boylston St, Boston, MA 02115',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 200 }
  },
  {
    name: 'Lolita Cocina & Tequila Bar',
    location: { type: 'Point', coordinates: [-71.0815, 42.3502] },
    address: '271 Dartmouth St, Boston, MA 02116',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '01:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['restaurant', 'bar', 'lounge'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 180 }
  },
  {
    name: 'The Beehive',
    location: { type: 'Point', coordinates: [-71.0756, 42.3445] },
    address: '541 Tremont St, Boston, MA 02116',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '01:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '10:00', close: '01:00' }
    },
    tags: ['restaurant', 'bar', 'lounge'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 220 }
  },
  
  // Fenway / Kenmore
  {
    name: 'Cask \'n Flagon',
    location: { type: 'Point', coordinates: [-71.0974, 42.3467] },
    address: '62 Brookline Ave, Boston, MA 02215',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 400 }
  },
  {
    name: 'Bleacher Bar',
    location: { type: 'Point', coordinates: [-71.0972, 42.3465] },
    address: '82A Lansdowne St, Boston, MA 02215',
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
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 120 }
  },
  
  // Seaport
  {
    name: 'Legal Harborside',
    location: { type: 'Point', coordinates: [-71.0412, 42.3498] },
    address: '270 Northern Ave, Boston, MA 02210',
    hours: {
      monday: { open: '11:00', close: '01:00' },
      tuesday: { open: '11:00', close: '01:00' },
      wednesday: { open: '11:00', close: '01:00' },
      thursday: { open: '11:00', close: '01:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '01:00' }
    },
    tags: ['restaurant', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 350 }
  },
  {
    name: 'YOTEL Boston',
    location: { type: 'Point', coordinates: [-71.0405, 42.3501] },
    address: '65 Seaport Blvd, Boston, MA 02210',
    hours: {
      monday: { open: '17:00', close: '02:00' },
      tuesday: { open: '17:00', close: '02:00' },
      wednesday: { open: '17:00', close: '02:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '02:00' }
    },
    tags: ['lounge', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 10, accessibility: true, minAge: 21, capacity: 200 }
  },
  
  // South End
  {
    name: 'Coppa',
    location: { type: 'Point', coordinates: [-71.0751, 42.3442] },
    address: '253 Shawmut Ave, Boston, MA 02118',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '01:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['restaurant', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 80 }
  },
  
  // Allston / Brighton
  {
    name: 'The Avenue',
    location: { type: 'Point', coordinates: [-71.1315, 42.3512] },
    address: '1249 Commonwealth Ave, Allston, MA 02134',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 150 }
  },
  {
    name: 'Deep Ellum',
    location: { type: 'Point', coordinates: [-71.1308, 42.3515] },
    address: '477 Cambridge St, Allston, MA 02134',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '01:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['bar', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 100 }
  },
  
  // Cambridge (near MIT/Harvard)
  {
    name: 'The Middle East',
    location: { type: 'Point', coordinates: [-71.1031, 42.3650] },
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
    staticAttributes: { coverCharge: 15, accessibility: true, minAge: 21, capacity: 300 }
  },
  {
    name: 'Phoenix Landing',
    location: { type: 'Point', coordinates: [-71.1041, 42.3643] },
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
    staticAttributes: { coverCharge: 5, accessibility: true, minAge: 21, capacity: 250 }
  },
  {
    name: 'Miracle of Science',
    location: { type: 'Point', coordinates: [-71.0956, 42.3617] },
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
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 100 }
  },
  {
    name: 'Grendel\'s Den',
    location: { type: 'Point', coordinates: [-71.1199, 42.3736] },
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
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 150 }
  },
  {
    name: 'The Blue Note Jazz Club',
    location: { type: 'Point', coordinates: [-71.0923, 42.3497] },
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
    staticAttributes: { coverCharge: 10, accessibility: true, minAge: 21, capacity: 200 }
  },
  
  // Clubs and Nightlife
  {
    name: 'Royale Boston',
    location: { type: 'Point', coordinates: [-71.0702, 42.3508] },
    address: '279 Tremont St, Boston, MA 02116',
    hours: {
      monday: { open: '22:00', close: '02:00' },
      tuesday: { open: '22:00', close: '02:00' },
      wednesday: { open: '22:00', close: '02:00' },
      thursday: { open: '22:00', close: '02:00' },
      friday: { open: '22:00', close: '02:00' },
      saturday: { open: '22:00', close: '02:00' },
      sunday: { open: '22:00', close: '02:00' }
    },
    tags: ['club'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 20, accessibility: true, minAge: 21, capacity: 500 }
  },
  {
    name: 'Bijou Nightclub',
    location: { type: 'Point', coordinates: [-71.0623, 42.3521] },
    address: '51 Stuart St, Boston, MA 02116',
    hours: {
      monday: { open: '22:00', close: '02:00' },
      tuesday: { open: '22:00', close: '02:00' },
      wednesday: { open: '22:00', close: '02:00' },
      thursday: { open: '22:00', close: '02:00' },
      friday: { open: '22:00', close: '02:00' },
      saturday: { open: '22:00', close: '02:00' },
      sunday: { open: '22:00', close: '02:00' }
    },
    tags: ['club'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 25, accessibility: true, minAge: 21, capacity: 400 }
  },
  {
    name: 'The Grand',
    location: { type: 'Point', coordinates: [-71.0615, 42.3518] },
    address: '58 Stuart St, Boston, MA 02116',
    hours: {
      monday: { open: '22:00', close: '02:00' },
      tuesday: { open: '22:00', close: '02:00' },
      wednesday: { open: '22:00', close: '02:00' },
      thursday: { open: '22:00', close: '02:00' },
      friday: { open: '22:00', close: '02:00' },
      saturday: { open: '22:00', close: '02:00' },
      sunday: { open: '22:00', close: '02:00' }
    },
    tags: ['club'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 20, accessibility: true, minAge: 21, capacity: 350 }
  },
  
  // Breweries
  {
    name: 'Harpoon Brewery',
    location: { type: 'Point', coordinates: [-71.0334, 42.3528] },
    address: '306 Northern Ave, Boston, MA 02210',
    hours: {
      monday: { open: '11:00', close: '23:00' },
      tuesday: { open: '11:00', close: '23:00' },
      wednesday: { open: '11:00', close: '23:00' },
      thursday: { open: '11:00', close: '23:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '23:00' }
    },
    tags: ['brewery', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 300 }
  },
  {
    name: 'Trillium Brewing Company',
    location: { type: 'Point', coordinates: [-71.0401, 42.3505] },
    address: '50 Thomson Pl, Boston, MA 02210',
    hours: {
      monday: { open: '12:00', close: '22:00' },
      tuesday: { open: '12:00', close: '22:00' },
      wednesday: { open: '12:00', close: '22:00' },
      thursday: { open: '12:00', close: '22:00' },
      friday: { open: '12:00', close: '23:00' },
      saturday: { open: '12:00', close: '23:00' },
      sunday: { open: '12:00', close: '22:00' }
    },
    tags: ['brewery', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 200 }
  },
  
  // More bars and lounges
  {
    name: 'The Hawthorne',
    location: { type: 'Point', coordinates: [-71.0812, 42.3505] },
    address: '500A Commonwealth Ave, Boston, MA 02215',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '01:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['lounge', 'bar'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 120 }
  },
  {
    name: 'Yvonne\'s',
    location: { type: 'Point', coordinates: [-71.0598, 42.3562] },
    address: '2 Winter Pl, Boston, MA 02108',
    hours: {
      monday: { open: '17:00', close: '02:00' },
      tuesday: { open: '17:00', close: '02:00' },
      wednesday: { open: '17:00', close: '02:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '02:00' }
    },
    tags: ['lounge', 'restaurant'],
    currentStatus: 'open',
    staticAttributes: { coverCharge: 0, accessibility: true, minAge: 21, capacity: 180 }
  }
];

// Options for generating reports
const waitTimeOptions = [0, 0, 0, 5, 5, 10, 10, 15, 15, 20, 20, 30, 30, 45, 60, 90, 120]; // Weighted toward lower times
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

const seedBoston = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');
    console.log('Starting comprehensive Boston data seed...\n');

    // Create multiple test users for more realistic data
    const testUsers = [];
    const userEmails = [
      'test@example.com',
      'user1@example.com',
      'user2@example.com',
      'user3@example.com',
      'user4@example.com',
      'user5@example.com'
    ];

    for (const email of userEmails) {
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          email,
          passwordHash: 'password123', // Will be hashed by pre-save hook
          displayName: email.split('@')[0],
          role: 'patron',
          homeArea: randomElement(['Boston', 'Cambridge', 'Allston', 'Back Bay', 'Fenway'])
        });
        await user.save();
        console.log(`Created user: ${email}`);
      }
      testUsers.push(user);
    }

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nClearing existing data...');
    await Venue.deleteMany({});
    await WaitReport.deleteMany({});
    await VibeReport.deleteMany({});
    console.log('Cleared existing venues and reports\n');

    // Insert Boston venues
    console.log(`Inserting ${bostonVenues.length} Boston venues...`);
    const venues = await Venue.insertMany(bostonVenues);
    console.log(`✓ Inserted ${venues.length} venues\n`);

    // Generate reports for each venue
    let totalWaitReports = 0;
    let totalVibeReports = 0;

    for (const venue of venues) {
      const venueLng = venue.location.coordinates[0];
      const venueLat = venue.location.coordinates[1];

      // Determine report volume based on venue type (clubs get more reports)
      const isClub = venue.tags.includes('club');
      const numWaitReports = isClub ? randomInt(40, 60) : randomInt(25, 45);
      const numVibeReports = isClub ? randomInt(35, 55) : randomInt(20, 40);

      // Generate wait reports spread over the past 7 days
      for (let i = 0; i < numWaitReports; i++) {
        // Create reports with realistic time distribution
        // More reports on weekends and evenings
        let createdAt;
        const dayOfWeek = randomInt(0, 6);
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        
        if (isWeekend) {
          // Weekend: more reports in evening (20:00-02:00)
          const hour = randomInt(20, 26) % 24;
          createdAt = dateAtTime(hour, randomInt(0, 59), 6 - dayOfWeek);
        } else {
          // Weekday: spread throughout evening
          const hour = randomInt(17, 26) % 24;
          createdAt = dateAtTime(hour, randomInt(0, 59), 6 - dayOfWeek);
        }

        // Some reports are very recent (last 2 hours)
        if (Math.random() < 0.15) {
          createdAt = new Date(Date.now() - randomInt(0, 120) * 60 * 1000);
        }

        // Wait times vary by time of day and venue type
        let reportedWaitMinutes = randomElement(waitTimeOptions);
        const hour = createdAt.getHours();
        if (hour >= 22 || hour < 2) {
          // Peak hours: higher wait times
          reportedWaitMinutes = randomElement([10, 15, 20, 30, 45, 60, 90]);
        } else if (hour >= 17 && hour < 22) {
          // Evening: moderate wait times
          reportedWaitMinutes = randomElement([0, 5, 10, 15, 20, 30]);
        } else {
          // Daytime: lower wait times
          reportedWaitMinutes = randomElement([0, 0, 5, 10, 15]);
        }

        // Location slightly offset from venue
        const reportLng = addRandomOffset(venueLng, 30);
        const reportLat = addRandomOffset(venueLat, 30);

        const waitReport = new WaitReport({
          venueId: venue._id,
          userId: randomElement(testUsers)._id,
          reportedWaitMinutes,
          geofenceVerified: true,
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

      // Generate vibe reports spread over the past 7 days
      for (let i = 0; i < numVibeReports; i++) {
        // Similar time distribution as wait reports
        let createdAt;
        const dayOfWeek = randomInt(0, 6);
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        
        if (isWeekend) {
          const hour = randomInt(20, 26) % 24;
          createdAt = dateAtTime(hour, randomInt(0, 59), 6 - dayOfWeek);
        } else {
          const hour = randomInt(17, 26) % 24;
          createdAt = dateAtTime(hour, randomInt(0, 59), 6 - dayOfWeek);
        }

        // Some reports are very recent
        if (Math.random() < 0.15) {
          createdAt = new Date(Date.now() - randomInt(0, 120) * 60 * 1000);
        }

        // Vibe varies by time and venue type
        let crowdDensity = randomElement(crowdDensityOptions);
        let noiseLevel = randomElement(noiseLevelOptions);
        let energyLevel = randomElement(energyLevelOptions);
        
        const hour = createdAt.getHours();
        if (hour >= 22 || hour < 2) {
          // Peak hours: higher energy
          crowdDensity = randomElement(['medium', 'high', 'high']);
          noiseLevel = randomElement(['moderate', 'loud', 'loud']);
          energyLevel = randomElement(['medium', 'hype', 'hype']);
        } else if (hour >= 17 && hour < 22) {
          // Evening: moderate
          crowdDensity = randomElement(['low', 'medium', 'medium']);
          noiseLevel = randomElement(['chill', 'moderate', 'moderate']);
          energyLevel = randomElement(['low', 'medium', 'medium']);
        } else {
          // Daytime: chill
          crowdDensity = randomElement(['low', 'low', 'medium']);
          noiseLevel = randomElement(['chill', 'chill', 'moderate']);
          energyLevel = randomElement(['low', 'low', 'medium']);
        }

        // Clubs have different music
        let musicTags = randomElement(musicTagOptions);
        if (venue.tags.includes('club')) {
          musicTags = randomElement([
            ['edm', 'dj'],
            ['hip_hop', 'dj'],
            ['pop', 'dj'],
            ['latin', 'dj'],
            ['dj']
          ]);
        } else if (venue.tags.includes('brewery')) {
          musicTags = randomElement([
            ['rock', 'live_band'],
            ['pop'],
            ['none']
          ]);
        } else if (venue.name.includes('Jazz')) {
          musicTags = ['jazz', 'live_band'];
        }

        // Location slightly offset from venue
        const reportLng = addRandomOffset(venueLng, 30);
        const reportLat = addRandomOffset(venueLat, 30);

        const vibeReport = new VibeReport({
          venueId: venue._id,
          userId: randomElement(testUsers)._id,
          crowdDensity,
          noiseLevel,
          energyLevel,
          musicTags,
          geofenceVerified: true,
          location: {
            type: 'Point',
            coordinates: [reportLng, reportLat]
          },
          createdAt
        });

        await vibeReport.save();
        totalVibeReports++;
      }

      console.log(`✓ ${venue.name}: ${numWaitReports} wait reports, ${numVibeReports} vibe reports`);
    }

    console.log(`\n✅ Database seeding completed!`);
    console.log(`   Total venues: ${venues.length}`);
    console.log(`   Total wait reports: ${totalWaitReports}`);
    console.log(`   Total vibe reports: ${totalVibeReports}`);
    console.log(`   Total users: ${testUsers.length}`);
    console.log(`   Reports span the past 7 days with realistic time distributions`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedBoston();
