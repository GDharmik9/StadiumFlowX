/**
 * Venue data generator for StadiumFlow.
 *
 * Creates an IMDF-compliant GeoJSON FeatureCollection representing
 * the Narendra Modi Stadium's seating blocks, amenities, and gates.
 * All features are positioned using real GPS coordinates derived from
 * the virtual 0-1000 grid coordinate system.
 *
 * @module utils/venue
 * @see https://register.apple.com/resources/imdf/ - Indoor Mapping Data Format
 */

import { virtualToGPS } from './coordinates';
import type { CongestionStatus, VenueFeatureProperties } from '../types';

// ─────────────────────────────────────────────
// Data Types
// ─────────────────────────────────────────────

/** Definition for a seating block in the stadium */
interface SeatingBlock {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly zone: string;
}

/** Definition for an amenity point in the concourse */
interface AmenityPoint {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly category: string;
  readonly status: CongestionStatus;
}

/** Definition for an entry gate */
interface GatePoint {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly category: string;
  readonly status: CongestionStatus;
}

// ─────────────────────────────────────────────
// Geometry Helpers
// ─────────────────────────────────────────────

/**
 * Creates a square polygon (wedge) in GPS coordinates centered on a virtual point.
 * Used to generate 3D building footprints for seating blocks.
 *
 * @param x - Virtual X coordinate of the center
 * @param y - Virtual Y coordinate of the center
 * @param dimension - Side length of the square in virtual units (default: 40)
 * @returns Array of [lng, lat] coordinate pairs forming a closed polygon ring
 */
const createWedge = (x: number, y: number, dimension: number = 40): number[][] => {
  const half = dimension / 2;
  return [
    [virtualToGPS(x - half, y - half).lng, virtualToGPS(x - half, y - half).lat],
    [virtualToGPS(x + half, y - half).lng, virtualToGPS(x + half, y - half).lat],
    [virtualToGPS(x + half, y + half).lng, virtualToGPS(x + half, y + half).lat],
    [virtualToGPS(x - half, y + half).lng, virtualToGPS(x - half, y + half).lat],
    [virtualToGPS(x - half, y - half).lng, virtualToGPS(x - half, y - half).lat], // Close ring
  ];
};

// ─────────────────────────────────────────────
// Stadium Configuration Data
// ─────────────────────────────────────────────

/**
 * 16 seating blocks arranged in an elliptical pattern matching
 * Narendra Modi Stadium's actual block layout.
 */
const SEATING_BLOCKS: readonly SeatingBlock[] = Object.freeze([
  { label: 'A', x: 350, y: 180, zone: 'North-West' },
  { label: 'B', x: 420, y: 150, zone: 'North' },
  { label: 'C', x: 580, y: 150, zone: 'North' },
  { label: 'D', x: 650, y: 180, zone: 'North-East' },
  { label: 'E', x: 780, y: 250, zone: 'North-East' },
  { label: 'F', x: 850, y: 350, zone: 'East' },
  { label: 'G', x: 880, y: 500, zone: 'East' },
  { label: 'H', x: 850, y: 650, zone: 'South-East' },
  { label: 'J', x: 750, y: 750, zone: 'South-East' },
  { label: 'K', x: 650, y: 820, zone: 'South' },
  { label: 'L', x: 500, y: 850, zone: 'South (Jio End)' },
  { label: 'M', x: 350, y: 820, zone: 'South-West' },
  { label: 'N', x: 250, y: 750, zone: 'South-West' },
  { label: 'P', x: 180, y: 650, zone: 'West' },
  { label: 'Q', x: 150, y: 500, zone: 'West' },
  { label: 'R', x: 180, y: 350, zone: 'North-West' },
]);

/**
 * Amenity points distributed along the concourse ring.
 * Includes food courts, washrooms, medical centers, and water stations.
 */
const AMENITIES: readonly AmenityPoint[] = Object.freeze([
  { label: 'Food Court 1', x: 820, y: 420, category: 'food_court', status: 'orange' },
  { label: 'Food Court 2', x: 180, y: 580, category: 'food_court', status: 'green' },
  { label: 'Washroom North', x: 500, y: 120, category: 'washroom', status: 'green' },
  { label: 'Washroom East', x: 880, y: 600, category: 'washroom', status: 'red' },
  { label: 'Washroom South', x: 500, y: 880, category: 'washroom', status: 'green' },
  { label: 'Washroom West', x: 120, y: 400, category: 'washroom', status: 'green' },
  { label: 'Medical Center', x: 450, y: 850, category: 'medical', status: 'green' },
  { label: 'Water Station', x: 700, y: 250, category: 'water', status: 'green' },
]);

/**
 * Stadium entry/exit gates at cardinal positions.
 */
const GATES: readonly GatePoint[] = Object.freeze([
  { label: 'Gate 1', x: 220, y: 850, category: 'entrance', status: 'green' },
  { label: 'Gate 2', x: 120, y: 500, category: 'entrance', status: 'orange' },
  { label: 'Gate 3', x: 780, y: 150, category: 'entrance', status: 'green' },
  { label: 'Gate 4', x: 880, y: 500, category: 'entrance', status: 'green' },
]);

// ─────────────────────────────────────────────
// GeoJSON Generator
// ─────────────────────────────────────────────

/** GeoJSON Feature type used throughout the venue */
interface VenueFeature {
  type: 'Feature';
  properties: VenueFeatureProperties;
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'Point'; coordinates: number[] };
}

/** GeoJSON FeatureCollection for the entire venue */
interface VenueFeatureCollection {
  type: 'FeatureCollection';
  features: VenueFeature[];
}

/**
 * Generates a complete GeoJSON FeatureCollection for the stadium venue.
 *
 * Produces three types of features:
 * - **Seating blocks** (Level 1): 3D polygon extrusions with height data
 * - **Amenities** (Level 0): Point features for food courts, washrooms, etc.
 * - **Gates** (Level 0): Point features for stadium entry/exit points
 *
 * Conforms to IMDF (Indoor Mapping Data Format) conventions for
 * `feature_type` values: 'unit', 'amenity', 'opening'.
 *
 * @returns GeoJSON FeatureCollection with all venue features
 */
export const generateVenueGeoJSON = (): VenueFeatureCollection => {
  const features: VenueFeature[] = [];

  // Level 1: Seating block 3D extrusions
  SEATING_BLOCKS.forEach((block) => {
    features.push({
      type: 'Feature',
      properties: {
        id: `block_${block.label.toLowerCase()}`,
        feature_type: 'unit',
        category: 'seating_block',
        name: `Block ${block.label} (${block.zone})`,
        level: 1,
        color: '#1a5b82',
        height: 35 + Math.random() * 15,
        base_height: 5,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [createWedge(block.x, block.y, 45)],
      },
    });
  });

  // Level 0: Amenity hotspot points
  AMENITIES.forEach((amenity) => {
    const gps = virtualToGPS(amenity.x, amenity.y);
    features.push({
      type: 'Feature',
      properties: {
        id: amenity.label.replace(/ /g, '_').toLowerCase(),
        feature_type: 'amenity',
        category: amenity.category,
        name: amenity.label,
        level: 0,
        status: amenity.status,
        vx: amenity.x,
        vy: amenity.y,
      },
      geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] },
    });
  });

  // Level 0: Gate entry points
  GATES.forEach((gate) => {
    const gps = virtualToGPS(gate.x, gate.y);
    features.push({
      type: 'Feature',
      properties: {
        id: gate.label.replace(/ /g, '_').toLowerCase(),
        feature_type: 'opening',
        category: gate.category,
        name: gate.label,
        level: 0,
        status: gate.status,
        vx: gate.x,
        vy: gate.y,
      },
      geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] },
    });
  });

  return { type: 'FeatureCollection', features };
};
