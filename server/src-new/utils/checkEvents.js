const { getDb } = require('./database');

async function checkEvents() {
  const db = await getDb();
  const events = db.collection('VenueEvent.events');
  
  const allEvents = await events.find({}).toArray();
  console.log(`\nTotal events in database: ${allEvents.length}`);
  
  if (allEvents.length > 0) {
    console.log('\nEvents:');
    allEvents.forEach((event, idx) => {
      console.log(`${idx + 1}. ${event.title}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Start: ${event.startTime}`);
      console.log(`   Tags: ${event.tags.join(', ')}`);
      console.log('');
    });
  } else {
    console.log('No events found in database!');
  }
  
  process.exit(0);
}

checkEvents().catch(console.error);
