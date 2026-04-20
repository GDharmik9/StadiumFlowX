import { getPath, Coordinate } from '../utils/pathfinding';

// ─────────────────────────────────────────────
// Unit Tests: StadiumFlow Pathfinding Engine
// ─────────────────────────────────────────────

describe('Pathfinding Engine', () => {
  test('should return a valid path with start and end points', () => {
    const start: Coordinate = { x: 500, y: 950 };
    const end: Coordinate = { x: 500, y: 100 };
    const path = getPath(start, end);

    expect(Array.isArray(path)).toBe(true);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(end);
  });

  test('should generate at least 10 intermediate waypoints', () => {
    const start: Coordinate = { x: 100, y: 500 };
    const end: Coordinate = { x: 900, y: 500 };
    const path = getPath(start, end);

    // Start + end + at least 10 arc waypoints
    expect(path.length).toBeGreaterThanOrEqual(12);
  });

  test('intermediate points should lie on the commute ring (R=300)', () => {
    const start: Coordinate = { x: 200, y: 200 };
    const end: Coordinate = { x: 800, y: 800 };
    const path = getPath(start, end);

    const CENTER = { x: 500, y: 500 };
    const RADIUS = 300;
    const tolerance = 5; // Allow small floating point variance

    // Check intermediate points (skip first=start, last=end)
    for (let i = 1; i < path.length - 1; i++) {
      const dist = Math.sqrt(
        Math.pow(path[i].x - CENTER.x, 2) + Math.pow(path[i].y - CENTER.y, 2)
      );
      expect(Math.abs(dist - RADIUS)).toBeLessThan(tolerance);
    }
  });

  test('should handle same start and end points gracefully', () => {
    const point: Coordinate = { x: 500, y: 500 };
    const path = getPath(point, point);

    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual(point);
  });

  test('should handle adjacent start and end points', () => {
    const start: Coordinate = { x: 500, y: 499 };
    const end: Coordinate = { x: 500, y: 501 };
    const path = getPath(start, end);

    expect(path).toBeDefined();
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(end);
  });

  test('should handle edge coordinates (boundary values)', () => {
    const start: Coordinate = { x: 0, y: 0 };
    const end: Coordinate = { x: 1000, y: 1000 };
    const path = getPath(start, end);

    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThan(2);
  });

  test('all coordinates in path should be numeric', () => {
    const start: Coordinate = { x: 300, y: 700 };
    const end: Coordinate = { x: 700, y: 300 };
    const path = getPath(start, end);

    path.forEach((point) => {
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(isNaN(point.x)).toBe(false);
      expect(isNaN(point.y)).toBe(false);
    });
  });
});

describe('Pathfinding Efficiency', () => {
  test('should calculate path in under 10ms for any input', () => {
    const start: Coordinate = { x: 100, y: 100 };
    const end: Coordinate = { x: 900, y: 900 };

    const startTime = performance.now();
    getPath(start, end);
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(10);
  });

  test('should take shortest arc direction (clockwise vs counter-clockwise)', () => {
    const start: Coordinate = { x: 800, y: 500 }; // Right
    const end: Coordinate = { x: 500, y: 200 };   // Top

    const path = getPath(start, end);

    // Quarter circle should produce fewer steps than 3/4 circle
    const halfCircleSteps = Math.floor(Math.PI / 0.05);
    expect(path.length - 2).toBeLessThan(halfCircleSteps);
  });
});
