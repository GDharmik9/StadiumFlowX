export interface Coordinate {
    x: number;
    y: number;
}

// Global 3-Zone Architecture Variables
const COMMUTE_RADIUS = 300;
const CENTER = { x: 500, y: 500 };

/**
 * High-Performance "Snap-to-Ring" Pathfinding.
 * Calculates shortest mathematical Arc bridging origins intersecting the R=300 Commute Rail automatically.
 */
export const getPath = (start: Coordinate, end: Coordinate): Coordinate[] => {
    const path: Coordinate[] = [start];

    // 1. Calculate analytical angles mapping globally relative to the absolute pitch center
    let startAngle = Math.atan2(start.y - CENTER.y, start.x - CENTER.x);
    let endAngle = Math.atan2(end.y - CENTER.y, end.x - CENTER.x);

    // Normalize angular boundaries natively locking strictly between 0 and 2PI
    if (startAngle < 0) startAngle += 2 * Math.PI;
    if (endAngle < 0) endAngle += 2 * Math.PI;

    // Calculate mathematically optimal arc flow direction
    let diff = endAngle - startAngle;
    
    // Resolve cross-origin wrap bounds (Shortest Path projection)
    if (diff > Math.PI) diff -= 2 * Math.PI;
    else if (diff < -Math.PI) diff += 2 * Math.PI;

    // 2. Extrapolate dense Array plotting strictly clamping the sequence mathematically mapping 360 curves!
    const steps = Math.max(10, Math.floor(Math.abs(diff) / 0.05)); 
    for (let i = 0; i <= steps; i++) {
        // Curve trajectory interpolation 
        const currentAngle = startAngle + (diff * (i / steps));
        path.push({
            x: CENTER.x + COMMUTE_RADIUS * Math.cos(currentAngle),
            y: CENTER.y + COMMUTE_RADIUS * Math.sin(currentAngle)
        });
    }

    path.push(end);
    return path;
};
