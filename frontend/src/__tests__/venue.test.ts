import { generateVenueGeoJSON } from '../utils/venue';

// ─────────────────────────────────────────────
// Unit Tests: Venue GeoJSON Generation
// ─────────────────────────────────────────────

describe('Venue GeoJSON Generator', () => {
  const geoJSON = generateVenueGeoJSON();

  test('should return a valid GeoJSON FeatureCollection', () => {
    expect(geoJSON).toHaveProperty('type', 'FeatureCollection');
    expect(geoJSON).toHaveProperty('features');
    expect(Array.isArray(geoJSON.features)).toBe(true);
  });

  test('should generate features for seating blocks, amenities, and gates', () => {
    const types = new Set(geoJSON.features.map((f: any) => f.properties.feature_type));
    expect(types.has('unit')).toBe(true);
    expect(types.has('amenity')).toBe(true);
    expect(types.has('opening')).toBe(true);
  });

  test('should generate exactly 16 seating blocks (A through R)', () => {
    const blocks = geoJSON.features.filter((f: any) => f.properties.feature_type === 'unit');
    expect(blocks.length).toBe(16);
  });

  test('should generate 8 amenities', () => {
    const amenities = geoJSON.features.filter((f: any) => f.properties.feature_type === 'amenity');
    expect(amenities.length).toBe(8);
  });

  test('should generate 4 gates', () => {
    const gates = geoJSON.features.filter((f: any) => f.properties.feature_type === 'opening');
    expect(gates.length).toBe(4);
  });

  test('all features should have unique IDs', () => {
    const ids = geoJSON.features.map((f: any) => f.properties.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('seating blocks should have polygon geometry with 5 coordinates (closed ring)', () => {
    const blocks = geoJSON.features.filter((f: any) => f.properties.feature_type === 'unit');
    blocks.forEach((block: any) => {
      expect(block.geometry.type).toBe('Polygon');
      expect(block.geometry.coordinates[0].length).toBe(5);
      // First and last coordinate should match (closed ring)
      expect(block.geometry.coordinates[0][0]).toEqual(block.geometry.coordinates[0][4]);
    });
  });

  test('amenities and gates should have Point geometry', () => {
    const points = geoJSON.features.filter(
      (f: any) => f.properties.feature_type === 'amenity' || f.properties.feature_type === 'opening'
    );
    points.forEach((point: any) => {
      expect(point.geometry.type).toBe('Point');
      expect(point.geometry.coordinates.length).toBe(2);
    });
  });

  test('all amenities should have a valid category', () => {
    const validCategories = ['food_court', 'washroom', 'medical', 'water', 'entrance'];
    const pointFeatures = geoJSON.features.filter(
      (f: any) => f.properties.feature_type !== 'unit'
    );
    pointFeatures.forEach((f: any) => {
      expect(validCategories).toContain(f.properties.category);
    });
  });

  test('all features should have a name property', () => {
    geoJSON.features.forEach((f: any) => {
      expect(f.properties.name).toBeDefined();
      expect(typeof f.properties.name).toBe('string');
      expect(f.properties.name.length).toBeGreaterThan(0);
    });
  });

  test('seating blocks should have valid height and base_height', () => {
    const blocks = geoJSON.features.filter((f: any) => f.properties.feature_type === 'unit');
    blocks.forEach((block: any) => {
      expect(block.properties.height).toBeGreaterThan(0);
      expect(block.properties.base_height).toBeGreaterThanOrEqual(0);
      expect(block.properties.height).toBeGreaterThan(block.properties.base_height);
    });
  });

  test('amenities should have valid status values', () => {
    const validStatuses = ['green', 'orange', 'red', 'yellow'];
    const amenities = geoJSON.features.filter((f: any) => f.properties.feature_type === 'amenity');
    amenities.forEach((a: any) => {
      expect(validStatuses).toContain(a.properties.status);
    });
  });

  test('point features should have virtual coordinates (vx, vy)', () => {
    const points = geoJSON.features.filter((f: any) => f.properties.feature_type !== 'unit');
    points.forEach((p: any) => {
      expect(typeof p.properties.vx).toBe('number');
      expect(typeof p.properties.vy).toBe('number');
      expect(p.properties.vx).toBeGreaterThanOrEqual(0);
      expect(p.properties.vx).toBeLessThanOrEqual(1000);
      expect(p.properties.vy).toBeGreaterThanOrEqual(0);
      expect(p.properties.vy).toBeLessThanOrEqual(1000);
    });
  });
});

describe('Venue Data Consistency', () => {
  test('should produce identical output on repeated calls (deterministic IDs)', () => {
    const geoJSON1 = generateVenueGeoJSON();
    const geoJSON2 = generateVenueGeoJSON();

    // Feature count should be the same
    expect(geoJSON1.features.length).toBe(geoJSON2.features.length);

    // All IDs should match
    const ids1 = geoJSON1.features.map((f: any) => f.properties.id).sort();
    const ids2 = geoJSON2.features.map((f: any) => f.properties.id).sort();
    expect(ids1).toEqual(ids2);
  });
});
