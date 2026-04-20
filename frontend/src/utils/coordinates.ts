/**
 * Spatial coordinate transformer for StadiumFlow.
 *
 * Maps coordinates from the abstract 0-1000 virtual grid to real-world
 * GPS coordinates centered on Narendra Modi Stadium, Ahmedabad.
 *
 * @module utils/coordinates
 */

import type { GPSCoordinate } from '../types';

/** GPS center of Narendra Modi Stadium (WGS84) */
export const STADIUM_CENTER: Readonly<GPSCoordinate> = Object.freeze({
  lat: 23.0919,
  lng: 72.5975,
});

/**
 * Scale factor for virtual-to-GPS conversion.
 * Calibrated to map the 1000x1000 virtual grid onto the stadium's
 * ~63-acre footprint (~0.25 km²).
 */
export const SCALE: number = 0.0000033;

/**
 * Transforms a virtual grid coordinate (0-1000) to GPS coordinates.
 *
 * The virtual grid uses a top-left origin with Y increasing downward.
 * GPS uses latitude increasing northward, so the Y axis is inverted.
 *
 * @param x - Virtual X coordinate (0-1000, west to east)
 * @param y - Virtual Y coordinate (0-1000, north to south)
 * @returns GPS coordinate { lat, lng } centered on the stadium
 *
 * @example
 * ```ts
 * const gps = virtualToGPS(500, 500); // Returns stadium center
 * const north = virtualToGPS(500, 0); // Returns northernmost point
 * ```
 */
export const virtualToGPS = (x: number, y: number): GPSCoordinate => ({
  lat: STADIUM_CENTER.lat - (y - 500) * SCALE,
  lng: STADIUM_CENTER.lng + (x - 500) * SCALE,
});
