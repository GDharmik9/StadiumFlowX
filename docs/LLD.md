# Low-Level Design (LLD) — StadiumFlow

## Overview

This document details the algorithms, data schemas, coordinate systems, and mathematical models underlying the StadiumFlow platform.

---

## 1. Coordinate System: Virtual → GPS Transformation

### The Problem
MapLibre GL JS operates on real-world GPS (WGS84) coordinates, but all internal stadium logic uses a simpler Cartesian `0–1000` grid for easy math.

### The Transformation Matrix

```
virtualToGPS(x, y):
  lat = STADIUM_CENTER.lat − (y − 500) × SCALE
  lng = STADIUM_CENTER.lng + (x − 500) × SCALE
```

**Constants:**
- `STADIUM_CENTER = { lat: 23.0919, lng: 72.5975 }` — Pitch center of Narendra Modi Stadium
- `SCALE = 0.0000033` — Maps ~1 virtual unit to ~0.37 meters on the ground

**Axis conventions:**
| Virtual | GPS | Direction |
|---------|-----|-----------|
| `x` increases → | `lng` increases | East |
| `y` increases ↓ | `lat` decreases | South |
| `(500, 500)` | `(23.0919, 72.5975)` | Stadium center |

**Full coverage:** A 1000×1000 virtual grid covers approximately `3.3km × 3.3km` — large enough for the entire 63-acre stadium complex.

---

## 2. Snap-to-Ring Pathfinding Algorithm

### Problem Statement
Navigation paths inside a circular stadium must **follow the concourse ring** — they cannot cut through the pitch. A naive straight-line path would traverse impossible geometry.

### Algorithm: Arc Interpolation on Fixed Radius Ring

```
INPUT:  start: {x, y}, end: {x, y}
OUTPUT: path[]: array of waypoints along concourse arc

CONSTANTS:
  CENTER = {x: 500, y: 500}   // Pitch center
  RADIUS = 300                 // Concourse ring radius (virtual units)
  ARC_STEP = 0.05             // Radians per waypoint (~2.9°)
  MIN_STEPS = 10              // Minimum intermediate waypoints

ALGORITHM:
  1. startAngle = atan2(start.y − CENTER.y, start.x − CENTER.x)
  2. endAngle   = atan2(end.y   − CENTER.y, end.x   − CENTER.x)
  3. Normalize both angles to [0, 2π)

  4. diff = endAngle − startAngle
     if diff > π:  diff −= 2π   // Take shorter clockwise arc
     if diff < −π: diff += 2π   // Take shorter counter-clockwise arc

  5. steps = max(MIN_STEPS, ⌊|diff| / ARC_STEP⌋)

  6. For i = 0 to steps:
       angle = startAngle + diff × (i / steps)
       path.push({
         x: CENTER.x + RADIUS × cos(angle),
         y: CENTER.y + RADIUS × sin(angle)
       })

  7. path = [start, ...arcWaypoints, end]
  RETURN path
```

**Complexity:**
- Time: O(n) where n = `|arc_length| / ARC_STEP`
- Space: O(n)
- Typical call: ~10–63 waypoints (0.1° to 180° arc)

**Key property:** The shortest arc is always selected, guaranteed by the `diff` clamping to `[−π, π]`. A path from East to North will arc counter-clockwise (shorter), never clockwise through South/West.

---

## 3. Procedural 3D GeoJSON Generation

### Seating Block Extrusions (`createWedge`)

Each of the 16 seating blocks is rendered as a 3D `fill-extrusion` polygon:

```
createWedge(x, y, dimension=45):
  half = dimension / 2
  corners = [
    virtualToGPS(x−half, y−half),  // NW (closes last)
    virtualToGPS(x+half, y−half),  // NE
    virtualToGPS(x+half, y+half),  // SE
    virtualToGPS(x−half, y+half),  // SW
    virtualToGPS(x−half, y−half),  // NW (closes ring)
  ]
  RETURN [lng, lat] pairs for each corner
```

**GeoJSON Feature Properties:**

```json
{
  "feature_type": "unit",
  "level": 1,
  "color": "#1a5b82",
  "height": 35–50,        // Random variation simulates real stadium depth
  "base_height": 5,       // Lifts blocks off the ground plane
  "category": "seating_block"
}
```

The MapLibre `fill-extrusion-height` property uses this to render genuine 3D towers.

### Amenity Points

Amenities are `GeoJSON Point` features at the corresponding GPS coordinates:

```json
{
  "feature_type": "amenity",
  "level": 0,
  "status": "green|orange|red",
  "category": "food_court|washroom|medical|water",
  "vx": 820, "vy": 420    // Stored virtual coords for pathfinding
}
```

The `vx`/`vy` virtual coords are stored alongside GPS so that when a fan taps a hotspot, the pathfinding engine can immediately compute a route in virtual space.

---

## 4. Ghost Agent Simulation System

### State Machine Per Agent

Each ghost agent runs an independent state machine at 150ms ticks:

```
State: { coords, path[], step, waitTicks }

TICK:
  if waitTicks > 0:
    waitTicks−−          // Agent resting at amenity
  elif step < path.length − 1:
    step++
    coords = path[step]  // Agent walking along arc
  else:
    newTarget = randomPoint(100–900, 100–900)
    path = getPath(coords, newTarget)
    step = 0
    waitTicks = 20 + rand(0–40)  // Simulate queue/rest time
```

### Cluster Deconfliction

Multiple agents seeded from the same Firestore user spawn position are offset to prevent stacking:

```
getClusteredOffset(userId: string) → {x, y}:
  hash = djb2(userId)           // Deterministic hash
  x = (hash % 30) − 15         // Offset ±15 virtual units
  y = ((hash >> 3) % 30) − 15
```

Uses a headless `useRef` (not `useState`) so 150ms simulation ticks **never trigger React re-renders**.

---

## 5. WebView Bridge Protocol

### Message Types

| Direction | Type | Payload | Purpose |
|-----------|------|---------|---------|
| App → Map | `INJECT_JS` | JavaScript string | Execute map operations |
| Map → App | `MAP_READY` | `true` | Map loaded, ready for commands |
| Map → App | `HOTSPOT_SELECTED` | Feature ID string | User tapped an amenity |

### Bridge Function

```javascript
// Inside WebView (MapLibre HTML)
function bridgeNativeInterface(type, payload) {
  const msg = JSON.stringify({ type, payload });
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(msg);  // Native bridge
  } else {
    window.parent.postMessage(msg, '*');          // Web iframe
  }
}
```

The React Native side listens via `onMessage` (native) or `window.addEventListener('message')` (web), with platform detection via `Platform.OS === 'web'`.

---

## 6. Scenario Engine State Machine

### User Trigger Flow

```
Firestore users collection change detected
         │
         ▼
data.hasEntered == true
AND data.scenario_deployed != true
AND userId NOT in deployedScenarios Set
         │
         ├── User_1 or User_3 ──► SCENARIO A (Early Arrival)
         │       │
         │       ├── Set Food_Court_West → orange
         │       └── setTimeout(10s) → Set Food_Court_West → green
         │
         └── User_2 or User_4 ──► SCENARIO B (Half-Time Rush)
                 │
                 ├── Set Gate_1 → yellow
                 ├── Set Food_Court_West → red
                 └── Push notification to user document
```

**Anti-loop protection:** Both an in-memory `Set<string>` (fast O(1) lookup) and a Firestore `scenario_deployed: true` flag (survives server restarts) prevent scenario re-triggering.

---

## 7. Congestion Status Model

### Status Levels

| Status | Hex Color | Trigger Condition | Fan Action |
|--------|-----------|-------------------|------------|
| `green` | `#4CD964` | `current_pings / capacity < 0.5` | Navigate normally |
| `yellow` | `#FFCC00` | `0.5 ≤ ratio < 0.7` | Minor slowdown |
| `orange` | `#FF9500` | `0.7 ≤ ratio < 0.8` | Consider alternatives |
| `red` | `#FF3B30` | `ratio ≥ 0.8` | Vibration alert + force reroute |

### Rerouting Algorithm

When `status === 'red'`, the app searches for the nearest alternative:

```
findAlternative(hitFeature):
  RETURN venueGeoJSON.features.find(f =>
    f.category == hitFeature.category   // Same type (e.g. washroom)
    AND f.id != hitFeature.id           // Different location
    AND f.status != 'red'               // Not also congested
  )
```

This scan is O(n) over the features array (n ≤ 28 total features), completing in microseconds.

---

## 8. Firestore Data Schema

### Collection: `stadium_zones`
```typescript
interface StadiumZone {
  type: 'gate' | 'stand' | 'food_court' | 'washroom';
  capacity: number;          // Maximum fan capacity
  current_pings: number;     // Active fan count (from BLE/GPS pings)
  coordinates: { x: number; y: number };  // Virtual coords
  status: 'green' | 'yellow' | 'orange' | 'red';
  updated_at: Timestamp;     // Server-side timestamp
}
```

### Collection: `users`
```typescript
interface StadiumUser {
  tester_id: string;         // e.g. "User_3"
  uid: string;               // Firebase Auth UID
  hasEntered: boolean;       // Triggers scenario engine
  target_seat_id: string;    // Assigned seat label
  current_coords: { x: number; y: number };
  scenario_deployed?: boolean;  // Anti-loop flag
  notification?: string | null; // Server-pushed alert text
}
```

### Collection: `tickets`
```typescript
interface Ticket {
  ticketId: string;          // e.g. "SF-2026-NMS-001"
  ownerName: string;
  seatInfo: string;
  target_coords: { x: number; y: number };
  entry_gate: string;        // e.g. "Gate_1"
  created_at: Timestamp;
}
```
