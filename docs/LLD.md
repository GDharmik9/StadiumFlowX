# Low Level Design (LLD)

Deep-dive structural schematics handling mathematical GIS mapping and real-time path calculations natively across the `StadiumFlow` architecture.

## 1. The Mapping Matrix (`virtualToGPS`)
Rather than dealing purely with Latitude and Longitude variables during development, the application enforces a local `0-1000` X/Y Cartesian constraint.

- **Focal Point (`500, 500`)** firmly anchors to `[72.5975, 23.0919]` GPS parameters (Pitch Center).
- Scale modifier `0.0000033` maps roughly ~1 pixel to ~35 meters physically on the ground natively preserving perfect geospatial geometry seamlessly.

## 2. Procedural GeoJSON Extrusions
The UI natively processes centroids representing Seat Tiers (e.g. Block D at `x:650, y:180`) through a mathematical `createWedge()` loop:
1. Takes Target `X, Y`.
2. Extends bounds uniformly by dynamic radial thresholds (e.g., 40 units).
3. Converts all 4 corners into abstract `virtualToGPS` points securely.
4. Outputs native IMDF specification Polygons feeding strictly into MapLibre `fill-extrusion` logic dynamically raising towers mathematically without 3D models.

## 3. Floor Elevators (Hardware Syncing)
To process the dense overlapping mapping of 63-acres safely on small screens, data explicitly hooks onto `Level: 0` vs `Level: 1` variables.
- Utilizing `window.postMessage`, the application sends stringified payload states from Native OS memory actively down into the HTML DOM.
- `map.setFilter('room-extrusion', ['==', 'level', data.payload])` engages hardware cropping hiding irrelevant building architecture instantly rendering the internal `Level 0` corridor networks entirely visible.

## 4. Snap-to-Ring Route Processing
Pathfinding calculates distance intrinsically checking Clockwise vs Counter-Clockwise arrays natively across a `concourse_nodes.json` 24-point loop bridging nodes `(i + length) % length` extracting shortest travel bounds programmatically!
