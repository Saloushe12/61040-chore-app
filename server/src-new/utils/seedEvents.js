const { getDb } = require('./database');
const { ObjectId } = require('./database');

async function seedEvents() {
  const db = await getDb();
  const venues = db.collection('Venue.venues');
  const events = db.collection('VenueEvent.events');

  // Get some venues to attach events to
  const venueList = await venues.find().limit(5).toArray();
  
  if (venueList.length === 0) {
    console.log('No venues found. Please seed venues first.');
    return;
  }

  // Clear existing events (optional)
  await events.deleteMany({});

  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const eventTemplates = [
    {
      title: 'Live Jazz Night',
      description: 'Smooth jazz performances by local artists. Come enjoy an evening of great music and cocktails.',
      tags: ['live_music', 'jazz'],
      startTime: new Date(today.getTime() + 19 * 60 * 60 * 1000), // 7 PM today
      endTime: new Date(today.getTime() + 23 * 60 * 60 * 1000), // 11 PM today
      status: 'in_progress'
    },
    {
      title: 'DJ Night - EDM Special',
      description: 'Top local DJs spinning the best electronic dance music. Get ready to dance the night away!',
      tags: ['dj', 'edm', 'dance'],
      startTime: new Date(today.getTime() + 22 * 60 * 60 * 1000), // 10 PM today
      endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000), // 3 AM tomorrow
      status: 'scheduled'
    },
    {
      title: 'Karaoke Tuesday',
      description: 'Show off your singing skills! Free entry, drink specials all night.',
      tags: ['karaoke'],
      startTime: new Date(tomorrow.getTime() + 20 * 60 * 60 * 1000), // 8 PM tomorrow
      endTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000), // 12 AM tomorrow
      status: 'scheduled'
    },
    {
      title: 'Trivia Night',
      description: 'Test your knowledge! Teams of up to 6. Prizes for top 3 teams.',
      tags: ['trivia'],
      startTime: new Date(tomorrow.getTime() + 19 * 60 * 60 * 1000), // 7 PM tomorrow
      endTime: new Date(tomorrow.getTime() + 22 * 60 * 60 * 1000), // 10 PM tomorrow
      status: 'scheduled'
    },
    {
      title: 'Comedy Open Mic',
      description: 'Local comedians testing new material. Always a fun and unpredictable night!',
      tags: ['comedy'],
      startTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000), // 8 PM in 3 days
      endTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000), // 11 PM in 3 days
      status: 'scheduled'
    },
    {
      title: 'Hip Hop Night',
      description: 'The best hip hop tracks from the 90s to today. No cover before 10 PM.',
      tags: ['dj', 'hip_hop', 'dance'],
      startTime: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000), // 9 PM in 4 days
      endTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 AM in 5 days
      status: 'scheduled'
    },
    {
      title: 'Live Band - Rock Covers',
      description: 'Local rock band playing all your favorite classic rock hits.',
      tags: ['live_music', 'rock'],
      startTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000), // 9 PM in 5 days
      endTime: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 AM in 6 days
      status: 'scheduled'
    },
    {
      title: 'Sports Night - Big Game',
      description: 'Watch the big game on our massive screens. Drink and food specials during the game.',
      tags: ['sports'],
      startTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000), // 7 PM in 2 days
      endTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000), // 11 PM in 2 days
      status: 'scheduled'
    },
    {
      title: 'Salsa Night',
      description: 'Latin dance night with free salsa lessons at 8 PM. DJ starts at 9 PM.',
      tags: ['dance', 'latin'],
      startTime: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000), // 8 PM in 6 days
      endTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 AM in 7 days
      status: 'scheduled'
    },
    {
      title: 'Acoustic Session',
      description: 'Intimate acoustic performances. Singer-songwriter showcase.',
      tags: ['live_music', 'acoustic'],
      startTime: new Date(nextWeek.getTime() + 19 * 60 * 60 * 1000), // 7 PM next week
      endTime: new Date(nextWeek.getTime() + 22 * 60 * 60 * 1000), // 10 PM next week
      status: 'scheduled'
    }
  ];

  const eventsToInsert = [];
  
  // Distribute events across venues
  eventTemplates.forEach((template, index) => {
    const venue = venueList[index % venueList.length];
    eventsToInsert.push({
      _id: new ObjectId(),
      venueId: venue._id,
      title: template.title,
      description: template.description,
      startTime: template.startTime,
      endTime: template.endTime,
      tags: template.tags,
      createdBy: new ObjectId(), // Fake user ID
      status: template.status,
      createdAt: new Date()
    });
  });

  await events.insertMany(eventsToInsert);
  
  console.log(`✅ Seeded ${eventsToInsert.length} events across ${venueList.length} venues`);
  console.log('Event distribution:');
  venueList.forEach((venue, idx) => {
    const venueEvents = eventsToInsert.filter(e => e.venueId.equals(venue._id));
    console.log(`  - ${venue.name}: ${venueEvents.length} events`);
  });
}

// Run if called directly
if (require.main === module) {
  seedEvents()
    .then(() => {
      console.log('✅ Event seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error seeding events:', error);
      process.exit(1);
    });
}

module.exports = { seedEvents };
