const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function seedStadiumSchema() {
  console.log("🚀 Starting StadiumFlow Schema Push...");

  const batch = db.batch();

  // 1. Seed Stadium Zones (Accuracy based on Narendra Modi Stadium layout)
  const zones = [
    { id: 'Gate_1', data: { type: 'gate', capacity: 500, current_pings: 50, coordinates: { x: 500, y: 950 }, status: 'green' } },
    { id: 'Zone_A_Stand', data: { type: 'stand', capacity: 2000, current_pings: 1200, coordinates: { x: 500, y: 750 }, status: 'yellow' } },
    { id: 'Food_Court_West', data: { type: 'food_court', capacity: 100, current_pings: 85, coordinates: { x: 150, y: 500 }, status: 'orange' } },
    { id: 'Washroom_North', data: { type: 'washroom', capacity: 50, current_pings: 10, coordinates: { x: 500, y: 100 }, status: 'green' } }
  ];

  zones.forEach(zone => {
    const ref = db.collection('stadium_zones').doc(zone.id);
    batch.set(ref, zone.data);
  });

  // 2. Seed Master Tickets for 4-User Simulation
  for (let i = 1; i <= 4; i++) {
    const ticketId = `test_ticket_00${i}`;
    const ref = db.collection('tickets').doc(ticketId);
    batch.set(ref, {
      ticketId: `SF-2026-NMS-00${i}`,
      ownerName: `Tester ${i}`,
      seatInfo: `Zone A, Row ${i}, Seat 12`,
      target_coords: { x: 500, y: 750 },
      entry_gate: "Gate_1"
    });
  }

  await batch.commit();
  console.log("✅ Schema and Seeding Data pushed successfully.");
}

seedStadiumSchema().then(() => process.exit(0)).catch(console.error);
