'use strict';

const { STADIUM_ZONES, isValidStatus } = require('../index');

// ─────────────────────────────────────────────
// Unit Tests: StadiumFlow Backend Engine
// ─────────────────────────────────────────────

describe('Stadium Zone Configuration', () => {
  test('should have all required stadium zones defined', () => {
    expect(STADIUM_ZONES).toBeDefined();
    expect(Array.isArray(STADIUM_ZONES)).toBe(true);
    expect(STADIUM_ZONES.length).toBeGreaterThanOrEqual(4);
  });

  test('each zone should have a valid structure', () => {
    STADIUM_ZONES.forEach((zone) => {
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('data');
      expect(zone.data).toHaveProperty('type');
      expect(zone.data).toHaveProperty('capacity');
      expect(zone.data).toHaveProperty('current_pings');
      expect(zone.data).toHaveProperty('coordinates');
      expect(zone.data).toHaveProperty('status');
      expect(zone.data.coordinates).toHaveProperty('x');
      expect(zone.data.coordinates).toHaveProperty('y');
    });
  });

  test('zone IDs should be unique', () => {
    const ids = STADIUM_ZONES.map((z) => z.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('zone capacities should be positive integers', () => {
    STADIUM_ZONES.forEach((zone) => {
      expect(zone.data.capacity).toBeGreaterThan(0);
      expect(Number.isInteger(zone.data.capacity)).toBe(true);
    });
  });

  test('zone coordinates should be within 0-1000 range', () => {
    STADIUM_ZONES.forEach((zone) => {
      expect(zone.data.coordinates.x).toBeGreaterThanOrEqual(0);
      expect(zone.data.coordinates.x).toBeLessThanOrEqual(1000);
      expect(zone.data.coordinates.y).toBeGreaterThanOrEqual(0);
      expect(zone.data.coordinates.y).toBeLessThanOrEqual(1000);
    });
  });

  test('current_pings should not exceed capacity', () => {
    STADIUM_ZONES.forEach((zone) => {
      expect(zone.data.current_pings).toBeLessThanOrEqual(zone.data.capacity);
    });
  });

  test('all initial statuses should be green', () => {
    STADIUM_ZONES.forEach((zone) => {
      expect(zone.data.status).toBe('green');
    });
  });

  test('STADIUM_ZONES should be immutable (Object.freeze)', () => {
    expect(Object.isFrozen(STADIUM_ZONES)).toBe(true);
  });
});

describe('Status Validation', () => {
  test('should accept valid statuses', () => {
    expect(isValidStatus('green')).toBe(true);
    expect(isValidStatus('yellow')).toBe(true);
    expect(isValidStatus('orange')).toBe(true);
    expect(isValidStatus('red')).toBe(true);
    expect(isValidStatus('purple')).toBe(true);
  });

  test('should reject invalid statuses', () => {
    expect(isValidStatus('blue')).toBe(false);
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus('GREEN')).toBe(false);
    expect(isValidStatus(null)).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
    expect(isValidStatus(123)).toBe(false);
  });
});

describe('Zone Type Coverage', () => {
  test('should include at least one gate', () => {
    const gates = STADIUM_ZONES.filter((z) => z.data.type === 'gate');
    expect(gates.length).toBeGreaterThanOrEqual(1);
  });

  test('should include at least one food court', () => {
    const foodCourts = STADIUM_ZONES.filter((z) => z.data.type === 'food_court');
    expect(foodCourts.length).toBeGreaterThanOrEqual(1);
  });

  test('should include at least one washroom', () => {
    const washrooms = STADIUM_ZONES.filter((z) => z.data.type === 'washroom');
    expect(washrooms.length).toBeGreaterThanOrEqual(1);
  });

  test('should include at least one stand', () => {
    const stands = STADIUM_ZONES.filter((z) => z.data.type === 'stand');
    expect(stands.length).toBeGreaterThanOrEqual(1);
  });
});
