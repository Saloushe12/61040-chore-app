// Seed script to populate database with sample Boston venues (src-new architecture)
require('dotenv').config({ path: './.env' });
const connectDB = require('../config/db');
const VenueConcept = require('../concepts/VenueConcept');

const bostonVenues = [
  {
    name: 'The Beehive',
    location: { lat: 42.3512, lon: -71.0715 },
    address: '541 Tremont St, Boston, MA 02116',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '10:00', close: '02:00' },
      sunday: { open: '10:00', close: '01:00' }
    },
    tags: ['bar', 'restaurant', 'live_music'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 180
    }
  },
  {
    name: 'Royale Boston',
    location: { lat: 42.3503, lon: -71.0750 },
    address: '279 Tremont St, Boston, MA 02116',
    hours: {
      monday: { open: '21:00', close: '02:00' },
      tuesday: { open: '21:00', close: '02:00' },
      wednesday: { open: '21:00', close: '02:00' },
      thursday: { open: '21:00', close: '02:00' },
      friday: { open: '21:00', close: '02:00' },
      saturday: { open: '21:00', close: '02:00' },
      sunday: { open: '21:00', close: '02:00' }
    },
    tags: ['club', 'dance', 'nightclub'],
    staticAttributes: {
      coverCharge: 20,
      accessibility: true,
      minAge: 21,
      capacity: 500
    }
  },
  {
    name: 'The Pour House',
    location: { lat: 42.3487, lon: -71.0815 },
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
    tags: ['bar', 'sports_bar', 'restaurant'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 200
    }
  },
  {
    name: 'Coppersmith',
    location: { lat: 42.3442, lon: -71.0628 },
    address: '40 W 3rd St, South Boston, MA 02127',
    hours: {
      monday: { open: '11:00', close: '01:00' },
      tuesday: { open: '11:00', close: '01:00' },
      wednesday: { open: '11:00', close: '01:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '10:00', close: '02:00' },
      sunday: { open: '10:00', close: '01:00' }
    },
    tags: ['bar', 'restaurant', 'rooftop'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 250
    }
  },
  {
    name: 'The Grand',
    location: { lat: 42.3601, lon: -71.0589 },
    address: '58 Seaport Blvd, Boston, MA 02210',
    hours: {
      monday: { open: '17:00', close: '02:00' },
      tuesday: { open: '17:00', close: '02:00' },
      wednesday: { open: '17:00', close: '02:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '02:00' }
    },
    tags: ['club', 'lounge', 'dance'],
    staticAttributes: {
      coverCharge: 25,
      accessibility: true,
      minAge: 21,
      capacity: 400
    }
  },
  {
    name: 'The Middle East',
    location: { lat: 42.3736, lon: -71.1199 },
    address: '472 Massachusetts Ave, Cambridge, MA 02139',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['bar', 'live_music', 'restaurant'],
    staticAttributes: {
      coverCharge: 10,
      accessibility: true,
      minAge: 21,
      capacity: 300
    }
  },
  {
    name: 'The Sinclair',
    location: { lat: 42.3731, lon: -71.1195 },
    address: '52 Church St, Cambridge, MA 02138',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['bar', 'live_music', 'restaurant'],
    staticAttributes: {
      coverCharge: 15,
      accessibility: true,
      minAge: 21,
      capacity: 525
    }
  },
  {
    name: 'The Lansdowne Pub',
    location: { lat: 42.3476, lon: -71.0972 },
    address: '9 Lansdowne St, Boston, MA 02215',
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
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 350
    }
  },
  {
    name: 'Cantina Italiana',
    location: { lat: 42.3508, lon: -71.0708 },
    address: '346 Hanover St, Boston, MA 02113',
    hours: {
      monday: { open: '11:30', close: '22:00' },
      tuesday: { open: '11:30', close: '22:00' },
      wednesday: { open: '11:30', close: '22:00' },
      thursday: { open: '11:30', close: '22:00' },
      friday: { open: '11:30', close: '23:00' },
      saturday: { open: '11:30', close: '23:00' },
      sunday: { open: '11:30', close: '22:00' }
    },
    tags: ['restaurant', 'bar', 'italian'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 0,
      capacity: 120
    }
  },
  {
    name: 'The Red Room',
    location: { lat: 42.3495, lon: -71.0812 },
    address: '1 Bennett St, Cambridge, MA 02138',
    hours: {
      monday: { open: '17:00', close: '01:00' },
      tuesday: { open: '17:00', close: '01:00' },
      wednesday: { open: '17:00', close: '01:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '01:00' }
    },
    tags: ['bar', 'lounge', 'cocktails'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 150
    }
  },
  {
    name: 'The Harp',
    location: { lat: 42.3503, lon: -71.0815 },
    address: '85 Causeway St, Boston, MA 02114',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['bar', 'sports_bar', 'irish'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 200
    }
  },
  {
    name: 'The Good Life',
    location: { lat: 42.3501, lon: -71.0752 },
    address: '28 Kingston St, Boston, MA 02111',
    hours: {
      monday: { open: '17:00', close: '02:00' },
      tuesday: { open: '17:00', close: '02:00' },
      wednesday: { open: '17:00', close: '02:00' },
      thursday: { open: '17:00', close: '02:00' },
      friday: { open: '17:00', close: '02:00' },
      saturday: { open: '17:00', close: '02:00' },
      sunday: { open: '17:00', close: '02:00' }
    },
    tags: ['bar', 'lounge', 'cocktails'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 21,
      capacity: 180
    }
  },
  {
    name: 'Fenway Park',
    location: { lat: 42.3467, lon: -71.0972 },
    address: '4 Yawkey Way, Boston, MA 02215',
    hours: {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    tags: ['sports_bar', 'restaurant', 'bar'],
    staticAttributes: {
      coverCharge: 0,
      accessibility: true,
      minAge: 0,
      capacity: 500
    }
  },
  {
    name: 'The Tam',
    location: { lat: 42.3505, lon: -71.0818 },
    address: '1 Boylston Pl, Boston, MA 02116',
    hours: {
      monday: { open: '11:00', close: '02:00' },
      tuesday: { open: '11:00', close: '02:00' },
      wednesday: { open: '11:00', close: '02:00' },
      thursday: { open: '11:00', close: '02:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:00', close: '02:00' }
    },
    tags: ['bar', 'sports_bar'],
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
    // Connect to database
    const db = await connectDB();
    console.log('Connected to MongoDB');

    // Initialize VenueConcept
    const venueConcept = new VenueConcept(db);

    // Create venues
    console.log('Creating Boston venues...');
    const createdVenues = [];
    
    for (const venueData of bostonVenues) {
      const result = await venueConcept.createVenue(venueData);
      
      if (result.error) {
        console.error(`Error creating ${venueData.name}:`, result.error);
      } else {
        console.log(`✓ Created: ${venueData.name} (ID: ${result.venueId})`);
        createdVenues.push({ name: venueData.name, id: result.venueId });
      }
    }

    console.log(`\n✅ Successfully created ${createdVenues.length} venues in Boston!`);
    console.log('\nCreated venues:');
    createdVenues.forEach(v => console.log(`  - ${v.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

