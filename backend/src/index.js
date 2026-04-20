'use strict';

const express = require('express');
const admin = require('firebase-admin');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ─────────────────────────────────────────────
// Logger: Structured logging for Cloud Run
// ─────────────────────────────────────────────
const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ severity: 'INFO', message, ...meta, timestamp: new Date().toISOString() })),
  warn: (message, meta = {}) => console.warn(JSON.stringify({ severity: 'WARNING', message, ...meta, timestamp: new Date().toISOString() })),
  error: (message, meta = {}) => console.error(JSON.stringify({ severity: 'ERROR', message, ...meta, timestamp: new Date().toISOString() })),
};

// ─────────────────────────────────────────────
// Firebase Admin Initialization
// ─────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

// ─────────────────────────────────────────────
// Express App Configuration
// ─────────────────────────────────────────────
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://disco-dispatch-493610-i4.web.app',
    'https://disco-dispatch-493610-i4.firebaseapp.com',
    'http://localhost:8081',
    'http://localhost:19006',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req, _res, next) => {
  logger.info('Incoming request', { method: req.method, path: req.path, ip: req.ip });
  next();
});

// ─────────────────────────────────────────────
// Health Check Endpoint (Google Cloud best practice)
// ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'StadiumFlow Engine',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ─────────────────────────────────────────────
// Constants: Stadium Zone Configuration
// ─────────────────────────────────────────────

/** @type {Array<{id: string, data: {type: string, capacity: number, current_pings: number, coordinates: {x: number, y: number}, status: string}}>} */
const STADIUM_ZONES = Object.freeze([
  { id: 'Gate_1', data: { type: 'gate', capacity: 500, current_pings: 50, coordinates: { x: 500, y: 950 }, status: 'green' } },
  { id: 'Zone_A_Stand', data: { type: 'stand', capacity: 2000, current_pings: 1200, coordinates: { x: 500, y: 750 }, status: 'green' } },
  { id: 'Food_Court_West', data: { type: 'food_court', capacity: 100, current_pings: 85, coordinates: { x: 150, y: 500 }, status: 'green' } },
  { id: 'Washroom_North', data: { type: 'washroom', capacity: 50, current_pings: 10, coordinates: { x: 500, y: 100 }, status: 'green' } },
]);

/** Valid congestion statuses */
const VALID_STATUSES = new Set(['green', 'yellow', 'orange', 'red', 'purple']);

/**
 * Validates a congestion status string.
 * @param {string} status - The status to validate.
 * @returns {boolean} True if the status is valid.
 */
function isValidStatus(status) {
  return VALID_STATUSES.has(status);
}

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

/**
 * GET /api/seed
 * One-time schema push to initialize Firestore with stadium data.
 * Populates stadium_zones and tickets collections.
 */
app.get('/api/seed', async (_req, res) => {
  try {
    logger.info('Starting StadiumFlow Schema Push');
    const batch = db.batch();

    STADIUM_ZONES.forEach((zone) => {
      const ref = db.collection('stadium_zones').doc(zone.id);
      batch.set(ref, { ...zone.data, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    });

    for (let i = 1; i <= 4; i++) {
      const ticketId = `test_ticket_00${i}`;
      const ref = db.collection('tickets').doc(ticketId);
      batch.set(ref, {
        ticketId: `SF-2026-NMS-00${i}`,
        ownerName: `Tester ${i}`,
        seatInfo: `Zone A, Row ${i}, Seat 12`,
        target_coords: { x: 500, y: 750 },
        entry_gate: 'Gate_1',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info('Schema push completed successfully');
    res.status(200).json({ success: true, message: 'Schema and seeding data pushed successfully.' });
  } catch (error) {
    logger.error('Schema push failed', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Internal server error during seeding.' });
  }
});

/**
 * GET /api/zones
 * Returns current congestion status of all stadium zones.
 */
app.get('/api/zones', async (_req, res) => {
  try {
    const snapshot = await db.collection('stadium_zones').get();
    const zones = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, zones });
  } catch (error) {
    logger.error('Failed to fetch zones', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stadium zones.' });
  }
});

/**
 * POST /api/scenario/end-match
 * Triggers the end-of-match scenario: all gates go red, other zones go orange.
 */
app.post('/api/scenario/end-match', async (_req, res) => {
  logger.info('Scenario C Executed: Final Over Rush');
  try {
    const batch = db.batch();
    const snapshot = await db.collection('stadium_zones').get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No stadium zones found.' });
    }

    snapshot.forEach((docSnap) => {
      const newStatus = docSnap.data().type === 'gate' ? 'red' : 'orange';
      batch.update(docSnap.ref, {
        status: newStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    logger.info('Scenario C deployed successfully');
    res.status(200).json({
      success: true,
      message: 'Scenario C Deployed: All user paths re-routing to isolated green paths.',
    });
  } catch (error) {
    logger.error('Scenario C failed', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Failed to deploy end-match scenario.' });
  }
});

/**
 * PATCH /api/zones/:zoneId/status
 * Updates the congestion status of a specific zone.
 * @param {string} zoneId - The zone ID to update.
 * @body {string} status - New status ('green', 'yellow', 'orange', 'red').
 */
app.patch('/api/zones/:zoneId/status', async (req, res) => {
  const { zoneId } = req.params;
  const { status } = req.body;

  // Input validation
  if (!zoneId || typeof zoneId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid zone ID.' });
  }
  if (!status || !isValidStatus(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` });
  }

  try {
    const zoneRef = db.collection('stadium_zones').doc(zoneId);
    const zoneDoc = await zoneRef.get();

    if (!zoneDoc.exists) {
      return res.status(404).json({ success: false, error: `Zone "${zoneId}" not found.` });
    }

    await zoneRef.update({
      status,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('Zone status updated', { zoneId, status });
    res.status(200).json({ success: true, zoneId, status });
  } catch (error) {
    logger.error('Zone status update failed', { error: error.message, zoneId });
    res.status(500).json({ success: false, error: 'Failed to update zone status.' });
  }
});

// ─────────────────────────────────────────────
// Scenario Engine: Real-time Firestore Listener
// ─────────────────────────────────────────────

/** @type {Set<string>} Tracks users whose scenarios have already been deployed */
const deployedScenarios = new Set();

/**
 * Listens for user check-ins and triggers appropriate congestion scenarios.
 * Scenario A (User_1, User_3): Simulates early arrival congestion at Food Court West.
 * Scenario B (User_2, User_4): Simulates half-time rush with multi-zone congestion.
 */
const unsubscribeUsers = db.collection('users').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'modified' && change.type !== 'added') return;

      const data = change.doc.data();
      const userId = data.tester_id;

      if (!data.hasEntered || data.scenario_deployed || deployedScenarios.has(userId)) {
        return;
      }

      logger.info('Triggering scenario for user', { userId });
      deployedScenarios.add(userId);

      // Persist anti-loop flag to Firestore
      change.doc.ref.update({ scenario_deployed: true }).catch((err) => {
        logger.error('Failed to set scenario_deployed flag', { userId, error: err.message });
      });

      if (userId === 'User_1' || userId === 'User_3') {
        // === SCENARIO A: The Early Arrival ===
        logger.info('Scenario A running', { userId });
        db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'orange' });

        // Simulated time shift: T+10 minutes compressed to 10 seconds
        setTimeout(() => {
          logger.info('Scenario A: Food Court West returning to green');
          db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'green' });
        }, 10000);
      } else if (userId === 'User_2' || userId === 'User_4') {
        // === SCENARIO B: The Half-Time Rush ===
        logger.info('Scenario B running', { userId });
        db.collection('stadium_zones').doc('Gate_1').update({ status: 'yellow' });
        db.collection('stadium_zones').doc('Food_Court_West').update({ status: 'red' });

        // Push reroute notification to the user's document
        change.doc.ref.update({
          notification: 'Food Court West is critically congested (25 Min Wait). Food Court East is currently Green. Redirecting your path immediately.',
        }).catch((err) => {
          logger.error('Failed to push notification', { userId, error: err.message });
        });
      }
    });
  },
  (error) => {
    logger.error('Firestore users listener error', { error: error.message });
  },
);

// ─────────────────────────────────────────────
// Global Error Handling
// ─────────────────────────────────────────────

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ─────────────────────────────────────────────
// Server Startup
// ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 8080;

const server = app.listen(PORT, () => {
  logger.info(`StadiumFlow Engine listening on port ${PORT}`, { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  unsubscribeUsers();
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, STADIUM_ZONES, isValidStatus };