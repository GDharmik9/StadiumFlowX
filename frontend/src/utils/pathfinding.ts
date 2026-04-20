/**
 * Concourse ring pathfinding engine for StadiumFlow.
 *
 * Computes navigation paths along the stadium's circular concourse walkway.
 * All routes snap to a fixed-radius ring around the pitch center,
 * simulating the real concourse architecture of Narendra Modi Stadium.
 *
 * @module utils/pathfinding
 */

/** 2D coordinate in the virtual 0-1000 stadium grid */
export interface Coordinate {
  x: number;
  y: number;
}

/** Center of the virtual stadium grid */
const CENTER: Readonly<Coordinate> = Object.freeze({ x: 500, y: 500 });

/** Radius of the concourse walkway ring in virtual units */
const COMMUTE_RADIUS: number = 300;

/** Angular step size (radians) for arc interpolation */
const ARC_STEP: number = 0.05;

/** Minimum number of intermediate waypoints on any path */
const MIN_STEPS: number = 10;

/**
 * Normalizes an angle to [0, 2π) range.
 * @param angle - Angle in radians
 * @returns Normalized angle in [0, 2π) range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
}

/**
 * Calculates the shortest arc difference between two angles.
 * Returns a value in [-π, π] representing the shortest rotation.
 *
 * @param startAngle - Starting angle in radians
 * @param endAngle - Ending angle in radians
 * @returns Shortest angular difference in [-π, π]
 */
function shortestArcDifference(startAngle: number, endAngle: number): number {
  let diff = endAngle - startAngle;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  else if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Generates a navigation path between two points via the concourse ring.
 *
 * The path consists of:
 * 1. The origin point (start)
 * 2. Waypoints along the R=300 concourse ring arc (shortest direction)
 * 3. The destination point (end)
 *
 * Time complexity: O(n) where n = arc_length / ARC_STEP
 * Space complexity: O(n) for the generated waypoint array
 *
 * @param start - Starting virtual coordinate
 * @param end - Destination virtual coordinate
 * @returns Array of coordinates forming the navigation path
 *
 * @example
 * ```ts
 * const path = getPath({ x: 500, y: 950 }, { x: 150, y: 500 });
 * // Returns: [start, ...arc_waypoints, end]
 * ```
 */
export const getPath = (start: Coordinate, end: Coordinate): Coordinate[] => {
  const path: Coordinate[] = [start];

  // Calculate angles from center to start/end points
  const startAngle = normalizeAngle(Math.atan2(start.y - CENTER.y, start.x - CENTER.x));
  const endAngle = normalizeAngle(Math.atan2(end.y - CENTER.y, end.x - CENTER.x));

  // Determine shortest arc direction
  const diff = shortestArcDifference(startAngle, endAngle);

  // Generate dense waypoint array along the concourse arc
  const steps = Math.max(MIN_STEPS, Math.floor(Math.abs(diff) / ARC_STEP));

  for (let i = 0; i <= steps; i++) {
    const currentAngle = startAngle + diff * (i / steps);
    path.push({
      x: CENTER.x + COMMUTE_RADIUS * Math.cos(currentAngle),
      y: CENTER.y + COMMUTE_RADIUS * Math.sin(currentAngle),
    });
  }

  path.push(end);
  return path;
};
