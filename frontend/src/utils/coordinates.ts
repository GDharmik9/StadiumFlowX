export const STADIUM_CENTER = { lat: 23.0919, lng: 72.5975 };
export const SCALE = 0.0000033; // Precision factor establishing the 63-acre boundary radius

/**
 * Spatial Transformer Matrix:
 * Derives true MapLibre Latitude/Longitude bounds from the abstract 0-1000 Hackathon Vector layout.
 */
export const virtualToGPS = (x: number, y: number) => ({
  lat: STADIUM_CENTER.lat - (y - 500) * SCALE,
  lng: STADIUM_CENTER.lng + (x - 500) * SCALE
});
