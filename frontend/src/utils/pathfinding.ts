import concourse from './concourse_nodes.json';

export interface Coordinate {
    x: number;
    y: number;
}

const getDistance = (p1: Coordinate, p2: Coordinate) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Mathematically lock origin tap to nearest topological ring coordinate
const getNearestNodeIndex = (point: Coordinate) => {
    let minIdx = 0;
    let minDist = Infinity;
    concourse.forEach((node, idx) => {
        const d = getDistance(point, node);
        if(d < minDist) {
            minDist = d;
            minIdx = idx;
        }
    });
    return minIdx;
};

/**
 * Derives the physically optimal route strictly bridging the walkable Concourse Ring.
 */
export const getPath = (start: Coordinate, end: Coordinate): Coordinate[] => {
    const startIdx = getNearestNodeIndex(start);
    const endIdx = getNearestNodeIndex(end);

    const length = concourse.length;
    
    // Array Topology Distance (Nodes jumped natively)
    const distClockwise = (endIdx - startIdx + length) % length;
    const distCounter = (startIdx - endIdx + length) % length;

    const path: Coordinate[] = [start];

    // Branch execution dynamically forcing strictly the shortest curve arc mapped globally
    if (distClockwise <= distCounter) {
        // Curve Clockwise mathematically
        for (let i = 0; i <= distClockwise; i++) {
            path.push(concourse[(startIdx + i) % length]);
        }
    } else {
        // Curve Counter-Clockwise recursively
        for (let i = 0; i <= distCounter; i++) {
            path.push(concourse[(startIdx - i + length) % length]);
        }
    }

    path.push(end);
    return path;
};
