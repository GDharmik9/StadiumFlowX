import { STADIUM_CENTER, SCALE, virtualToGPS } from '../utils/coordinates';

// ─────────────────────────────────────────────
// Unit Tests: GPS Coordinate Transformation
// ─────────────────────────────────────────────

describe('Stadium Center Constants', () => {
  test('stadium center should be at Narendra Modi Stadium coordinates', () => {
    expect(STADIUM_CENTER.lat).toBeCloseTo(23.0919, 4);
    expect(STADIUM_CENTER.lng).toBeCloseTo(72.5975, 4);
  });

  test('scale factor should be positive and small', () => {
    expect(SCALE).toBeGreaterThan(0);
    expect(SCALE).toBeLessThan(0.001);
  });
});

describe('Virtual to GPS Transformation', () => {
  test('center of virtual grid (500, 500) should map to stadium center', () => {
    const result = virtualToGPS(500, 500);
    expect(result.lat).toBeCloseTo(STADIUM_CENTER.lat, 6);
    expect(result.lng).toBeCloseTo(STADIUM_CENTER.lng, 6);
  });

  test('should return an object with lat and lng properties', () => {
    const result = virtualToGPS(0, 0);
    expect(result).toHaveProperty('lat');
    expect(result).toHaveProperty('lng');
    expect(typeof result.lat).toBe('number');
    expect(typeof result.lng).toBe('number');
  });

  test('moving north (decreasing y) should increase latitude', () => {
    const north = virtualToGPS(500, 0);
    const south = virtualToGPS(500, 1000);
    expect(north.lat).toBeGreaterThan(south.lat);
  });

  test('moving east (increasing x) should increase longitude', () => {
    const east = virtualToGPS(1000, 500);
    const west = virtualToGPS(0, 500);
    expect(east.lng).toBeGreaterThan(west.lng);
  });

  test('GPS output should always produce valid coordinates', () => {
    for (let x = 0; x <= 1000; x += 100) {
      for (let y = 0; y <= 1000; y += 100) {
        const result = virtualToGPS(x, y);
        expect(result.lat).toBeGreaterThan(-90);
        expect(result.lat).toBeLessThan(90);
        expect(result.lng).toBeGreaterThan(-180);
        expect(result.lng).toBeLessThan(180);
      }
    }
  });

  test('symmetric offsets should produce symmetric GPS deltas', () => {
    const north = virtualToGPS(500, 400);
    const south = virtualToGPS(500, 600);
    const center = virtualToGPS(500, 500);

    const deltaNorth = Math.abs(north.lat - center.lat);
    const deltaSouth = Math.abs(south.lat - center.lat);
    expect(deltaNorth).toBeCloseTo(deltaSouth, 10);
  });
});
