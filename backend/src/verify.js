const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

async function verify() {
  const doc = await db.collection('stadium_zones').doc('Gate_1').get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Gate_1 data:', doc.data());
    console.log('current_pings:', doc.data().current_pings);
  }
}
verify().then(() => process.exit(0)).catch(console.error);
