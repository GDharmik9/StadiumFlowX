const { execSync } = require('child_process');

async function triggerEnter() {
  const token = execSync('gcloud auth print-access-token').toString().trim();
  const url = 'https://firestore.googleapis.com/v1/projects/disco-dispatch-493610-i4/databases/(default)/documents/users/User_1';
  
  const payload = {
    name: "projects/disco-dispatch-493610-i4/databases/(default)/documents/users/User_1",
    fields: {
      tester_id: { stringValue: 'User_1' },
      hasEntered: { booleanValue: true },
      current_coords: { mapValue: { fields: { x: { integerValue: 500 }, y: { integerValue: 750 } } } },
      target_seat_id: { stringValue: 'test_ticket_001' }
    }
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log("Response:", data);
}

triggerEnter().catch(console.error);
