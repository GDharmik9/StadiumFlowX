import { STADIUM_CENTER, virtualToGPS } from './coordinates';

/**
 * Generates a geometric 3D Footprint procedurally centered on arbitrary abstract coordinates.
 */
const createWedge = (x: number, y: number, dimension = 40) => {
    const half = dimension / 2;
    return [
       [virtualToGPS(x - half, y - half).lng, virtualToGPS(x - half, y - half).lat],
       [virtualToGPS(x + half, y - half).lng, virtualToGPS(x + half, y - half).lat],
       [virtualToGPS(x + half, y + half).lng, virtualToGPS(x + half, y + half).lat],
       [virtualToGPS(x - half, y + half).lng, virtualToGPS(x - half, y + half).lat],
       [virtualToGPS(x - half, y - half).lng, virtualToGPS(x - half, y - half).lat],
    ];
};

const seatingBlocks = [
    { label: "A", x: 350, y: 180, zone: "North-West" },
    { label: "B", x: 420, y: 150, zone: "North" },
    { label: "C", x: 580, y: 150, zone: "North" },
    { label: "D", x: 650, y: 180, zone: "North-East" },
    { label: "E", x: 780, y: 250, zone: "North-East" },
    { label: "F", x: 850, y: 350, zone: "East" },
    { label: "G", x: 880, y: 500, zone: "East" },
    { label: "H", x: 850, y: 650, zone: "South-East" },
    { label: "J", x: 750, y: 750, zone: "South-East" },
    { label: "K", x: 650, y: 820, zone: "South" },
    { label: "L", x: 500, y: 850, zone: "South (Jio End)" },
    { label: "M", x: 350, y: 820, zone: "South-West" },
    { label: "N", x: 250, y: 750, zone: "South-West" },
    { label: "P", x: 180, y: 650, zone: "West" },
    { label: "Q", x: 150, y: 500, zone: "West" },
    { label: "R", x: 180, y: 350, zone: "North-West" }
];

const amenities = [
    { label: "Food Court 1", x: 820, y: 420, category: "food_court", status: "orange" },
    { label: "Food Court 2", x: 180, y: 580, category: "food_court", status: "green" },
    { label: "Washroom North", x: 500, y: 120, category: "washroom", status: "green" },
    { label: "Washroom East", x: 880, y: 600, category: "washroom", status: "red" },
    { label: "Washroom South", x: 500, y: 880, category: "washroom", status: "green" },
    { label: "Washroom West", x: 120, y: 400, category: "washroom", status: "green" },
    { label: "Medical Center", x: 450, y: 850, category: "medical", status: "green" },
    { label: "Water Station", x: 700, y: 250, category: "water", status: "green" }
];

const gates = [
    { label: "Gate 1", x: 220, y: 850, category: "entrance", status: "green" },
    { label: "Gate 2", x: 120, y: 500, category: "entrance", status: "orange" },
    { label: "Gate 3", x: 780, y: 150, category: "entrance", status: "green" },
    { label: "Gate 4", x: 880, y: 500, category: "entrance", status: "green" }
];

/**
 * IMDF Strict Standard FeatureCollection generator resolving entirely into valid MapLibre GeoJSON.
 */
export const generateVenueGeoJSON = () => {
   const features: any[] = [];

   // Generating Level 1 Building Extrusions (Polygons seamlessly simulating architecture)
   seatingBlocks.forEach((block) => {
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
               base_height: 5 
           },
           geometry: {
               type: 'Polygon',
               coordinates: [createWedge(block.x, block.y, 45)]
           }
       });
   });

    // Generating Level 0 Amenities (Points establishing the Hotspot navigation targets safely tucked in corridors)
   amenities.forEach((amenity) => {
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
                vy: amenity.y
            },
            geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] }
        });
   });

    // Generating Level 0 Gates (Points identifying structural entry nodes)
   gates.forEach((gate) => {
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
                vy: gate.y
            },
            geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] }
        });
   });

   return { type: 'FeatureCollection', features };
};
