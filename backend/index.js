const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

app.get('/', (req, res) => {
  res.send('StadiumFlow Engine is running 🏟️');
});

// Seed endpoint for One-Time Schema Push
app.get('/seed', async (req, res) => {
  try {
    console.log("🚀 Starting StadiumFlow Schema Push...");
    const batch = db.batch();

    const zones = [
      { id: 'Gate_1', data: { type: 'gate', capacity: 500, current_pings: 50, coordinates: { x: 500, y: 950 }, status: 'green' } },
      { id: 'Zone_A_Stand', data: { type: 'stand', capacity: 2000, current_pings: 1200, coordinates: { x: 500, y: 750 }, status: 'green' } },
      { id: 'Food_Court_West', data: { type: 'food_court', capacity: 100, current_pings: 85, coordinates: { x: 150, y: 500 }, status: 'green' } },
      { id: 'Washroom_North', data: { type: 'washroom', capacity: 50, current_pings: 10, coordinates: { x: 500, y: 100 }, status: 'green' } }
    ];

    zones.forEach(zone => {
      const ref = db.collection('stadium_zones').doc(zone.id);
      batch.set(ref, zone.data);
    });

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
    res.send("✅ Schema and Seeding Data pushed successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error seeding: " + error.message);
  }
});

// ==========================================
// THE SCENARIO ENGINE (Digital Reality Script Engine)
// ==========================================
db.collection('users').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'modified' || change.type === 'added') {
      const data = change.doc.data();
      const userId = data.tester_id;
      
      // Hook interceptor: Trigger event exactly when a map enters the flow
      if (data.hasEntered && !data.scenario_deployed) {
        console.log(`\n===========================================`);
        console.log(`[SCENARIO PUSHER] Triggering script for: ${userId}`);
        
        // Anti-loop tracking boundary lock
        change.doc.ref.update({ scenario_deployed: true });

        if (userId === 'User_1' || userId === 'User_3') {
           // === SCENARIO A: The Early Arrival ===
           console.log("-> SCENARIO A RUNNING");
           db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'orange' });
           
           // Simulated Time Shift: "T+10 Minutes" compressed into 10 real-time seconds for pitch demonstration
           setTimeout(() => {
               console.log("[EVENT]: Scenario A Global Clock Hit - FC West updating to Green.");
               db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'green' });
           }, 10000);
           
        } else if (userId === 'User_2' || userId === 'User_4') {
           // === SCENARIO B: The Half-Time Rush ===
           console.log("-> SCENARIO B RUNNING");
           db.collection('stadium_zones').doc('Gate_1').update({ status: 'yellow' });
           db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'purple' });
           
           // Target User Injection! Native react alert via firestore field payload
           change.doc.ref.update({ 
               notification: "Food Court West is critically congested (25 Min Wait). Food Court East is currently Green. Redirecting your path immediately."
           });
        }
      }
    }
  });
});

// REST Scenario Controller
app.post('/scenario/end-match', async (req, res) => {
    console.log("[SCENARIO C EXECUTED]: Final Over Rush");
    try {
        const batch = db.batch();
        const zones = await db.collection('stadium_zones').get();
        
        // Mass system override - locking tunnel bounds
        zones.forEach(docSnap => {
            if (docSnap.data().type === 'gate') {
                batch.update(docSnap.ref, { status: 'red' });
            } else {
                batch.update(docSnap.ref, { status: 'orange' });
            }
        });
        
        await batch.commit();
        res.send({ log: "Scenario C Deployed: All user paths re-routing to isolated Green paths." });
    } catch(err) {
        res.status(500).send(err.message);
    }
});


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Engine listening on port ${port}`);
});