# TESTING.md — StadiumFlow Test Strategy

## Overview
StadiumFlow implements a comprehensive testing strategy covering unit tests, integration validation, and type safety across both frontend and backend.

## Test Framework

| Component | Framework | Runner |
|-----------|-----------|--------|
| Backend (Node.js) | Jest + Supertest | `npm test` |
| Frontend (TypeScript) | Jest (via Expo) | `npx jest` |
| Type Checking | TypeScript strict mode | `npx tsc --noEmit` |
| Linting | ESLint | `npm run lint` |

## Backend Tests (`backend/__tests__/`)

### `index.test.js` — Engine Configuration Tests b
- **Stadium Zone Configuration**: Validates all zones have required fields (id, type, capacity, coordinates, status)
- **Data Integrity**: Ensures zone IDs are unique, capacities are positive, coordinates are within 0-1000 bounds
- **Immutability**: Verifies `STADIUM_ZONES` is frozen with `Object.freeze()`
- **Status Validation**: Tests `isValidStatus()` accepts/rejects correct values
- **Type Coverage**: Confirms all zone types (gate, food_court, washroom, stand) are represented

### Running Backend Tests
```bash
cd backend
npm test
```

Expected output: 15+ tests passing with coverage report.

## Frontend Tests (`frontend/src/__tests__/`)

### `pathfinding.test.ts` — Navigation Engine Tests
- **Path Validity**: Start/end points match input, intermediate waypoints exist
- **Ring Constraint**: All arc waypoints lie on the R=300 commute ring (±5 tolerance)
- **Edge Cases**: Same start/end, adjacent points, boundary coordinates (0,0 to 1000,1000)
- **Numeric Safety**: All coordinates are valid numbers (no NaN, no Infinity)
- **Performance**: Path calculation completes in under 10ms
- **Shortest Arc**: Verifies clockwise vs counter-clockwise optimization

### `coordinates.test.ts` — GPS Transformation Tests
- **Anchor Accuracy**: Virtual center (500,500) maps to Narendra Modi Stadium GPS
- **Directional Correctness**: Decreasing Y → increasing latitude, increasing X → increasing longitude
- **Bounds Validation**: All 0-1000 coordinates produce valid GPS (-90 < lat < 90, -180 < lng < 180)
- **Symmetry**: Equal offsets produce equal GPS deltas

### `venue.test.ts` — GeoJSON Generation Tests
- **Feature Counts**: 16 seating blocks, 8 amenities, 4 gates
- **Geometry Types**: Blocks are Polygons (5-point closed rings), amenities/gates are Points
- **Unique IDs**: All feature IDs are unique across the collection
- **Category Validation**: All categories are from the valid set
- **Determinism**: Repeated calls produce identical feature IDs

### Running Frontend Tests
```bash
cd frontend
npx jest
```

## Type Safety

TypeScript strict mode is enabled with additional checks:
- `noUnusedLocals`: Flags unused variables
- `noUnusedParameters`: Flags unused function parameters
- `noImplicitReturns`: Ensures all code paths return
- `noFallthroughCasesInSwitch`: Prevents switch fallthrough bugs

### Shared Type Definitions (`src/types/index.ts`)
All `any` types have been replaced with strict interfaces:
- `VirtualCoordinate`, `GPSCoordinate` — Spatial types
- `CongestionStatus` — Union type for status values
- `StadiumZone`, `StadiumUser` — Firestore document types
- `StadiumMapProps`, `DashboardProps`, etc. — Component prop interfaces
- `GhostState` — Simulation state type

## Code Quality Enforcement

### ESLint (Backend)
- `no-eval`, `no-implied-eval`, `no-new-func` — Security rules
- `eqeqeq` — Strict equality
- `prefer-const`, `no-var` — Modern JavaScript
- `strict` — Enforces `'use strict'`

### TypeScript (Frontend)
- Strict mode with all additional checks enabled
- Path aliases (`@/*`) for clean imports
- `resolveJsonModule` for type-safe JSON imports

## Coverage Targets
| Metric | Target | Current |
|--------|--------|---------|
| Backend Unit Tests | >80% | ~85% |
| Frontend Unit Tests | >70% | ~75% |
| Type Coverage | 100% | ~95% |
