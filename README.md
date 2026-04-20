# StadiumFlow 🏟️

**Real-time crowd congestion detection and smart navigation for mega stadiums — powered by GPS, Bluetooth beacons, and a 3D Digital Twin.**

---

## The Problem

Every major stadium event — cricket matches, concerts, football finals — packs **50,000 to 130,000 fans** into a single venue. The moment a fan steps through the gate, they face the same frustrating questions:

- *"Where is the nearest washroom that isn't packed?"*
- *"Which food court has the shortest queue?"*
- *"How do I get to my seat without walking into a dead-end crowd?"*

Today, fans have **zero visibility** into real-time crowd density. They walk blindly into congested corridors, wait 20+ minutes at overcrowded washrooms, and miss critical match moments — all because no one told them there was an empty alternative just 100 meters away.

**Stadium operators lose revenue** when fans skip food courts due to long queues. **Safety teams lose control** when bottleneck corridors become dangerously dense. **Fans lose patience** and never return.

---

## The Solution — StadiumFlow

StadiumFlow solves this with a simple idea: **detect where the crowd is, and guide fans where it isn't.**

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    DATA COLLECTION                       │
│                                                         │
│   📡 GPS Positioning    +    📶 Bluetooth Beacons       │
│   (Outdoor areas,            (Indoor concourses,        │
│    entry gates,               corridors, washrooms,     │
│    parking lots)              food courts)              │
│                                                         │
│              ↓ fused location data ↓                    │
│                                                         │
│         ┌──────────────────────────┐                    │
│         │  Firebase Cloud Engine   │                    │
│         │  ─────────────────────── │                    │
│         │  • Aggregates positions  │                    │
│         │  • Calculates density    │                    │
│         │  • Flags congestion      │                    │
│         │  • Finds alternatives    │                    │
│         └──────────┬───────────────┘                    │
│                    ↓                                    │
│         ┌──────────────────────────┐                    │
│         │   3D Digital Twin Map    │                    │
│         │  ─────────────────────── │                    │
│         │  • Live crowd heatmap    │                    │
│         │  • Smart rerouting       │                    │
│         │  • Congestion alerts     │                    │
│         │  • Haptic warnings       │                    │
│         └──────────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### 1. 📡 Detect — GPS + Bluetooth Fusion

**Outdoors** (gates, parking, open concourses): The app reads the fan's GPS coordinates to locate them on the stadium map.

**Indoors** (corridors, washrooms, food courts): GPS loses accuracy under concrete roofs. StadiumFlow switches to **Bluetooth Low Energy (BLE) beacons** installed at key points. Each beacon broadcasts a unique signal — the app triangulates the fan's position by measuring signal strength from nearby beacons, accurate to ~2 meters.

By fusing both signals, StadiumFlow knows **exactly** where every fan is, whether they're outside in the sun or deep inside the concourse tunnel.

### 2. 🔥 Analyze — Real-time Congestion Scoring

The backend aggregates anonymized positions from all active fans and computes a **live congestion score** for every amenity zone:

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Green | `#4CD964` | Clear — walk right in |
| 🟠 Orange | `#FF9500` | Busy — expect a short wait |
| 🔴 Red | `#FF3B30` | Congested — 15+ min wait, avoid |

These scores update in real-time on the 3D map, so fans can **see** congestion before walking into it.

### 3. 🗺️ Navigate — Smart Rerouting

When a fan taps a congested (red) zone, StadiumFlow doesn't just warn them — it **actively solves the problem**:

1. **Haptic vibration** fires immediately (the phone physically buzzes)
2. A **congestion warning overlay** appears: *"Washroom East — Extreme Crowd Density! Wait Time: 18 Minutes"*
3. The app identifies an **uncongested alternative** of the same type (e.g., Washroom North, which is green)
4. One tap on **"Reroute to Uncongested Area"** draws a navigation path to the better option

The fan saves 15 minutes. The congested zone gets relief. Everyone wins.

---

## What We Built — Technical Demo

StadiumFlow is demonstrated using the **Narendra Modi Stadium** (Ahmedabad, India) — the world's largest cricket stadium at 132,000 capacity.

### 🏗️ 3D Digital Twin Engine
- Built on **MapLibre GL JS** rendering real satellite imagery with 3D building extrusions
- 16 seating blocks (A through R) rendered as 3D structures with accurate positioning
- All amenities (food courts, washrooms, medical, water stations, gates) plotted with labeled pins
- Dual-layer view: **Seating (L1)** shows 3D blocks, **Concourse (L0)** shows amenity pins and crowd

### 👥 Live Crowd Simulation
- 10 autonomous AI agents walk the concourse in real-time, simulating match-day foot traffic
- Agents follow the stadium's circular walkway, pausing at amenities naturally
- Demonstrates how congestion builds and flows across the venue dynamically

### ⚡ Congestion Alert System
- Tap any **red** or **orange** amenity → phone vibrates + massive congestion warning
- Smart rerouting suggests uncongested alternatives of the same category
- Visual status badges: Green (Clear), Orange (Busy), Red (Critical)

### 🧭 Indoor Wayfinding
- Navigation paths drawn directly on the 3D map
- Constrained to the stadium's concourse ring (no paths through the pitch!)
- Ticket-gated: fans must check in at their assigned gate before navigating freely

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile App** | React Native (Expo) | Cross-platform iOS/Android/Web |
| **3D Map Engine** | MapLibre GL JS | Vector tiles, 3D extrusions, satellite imagery |
| **Backend** | Node.js + Firebase | Real-time data sync, congestion computation |
| **Database** | Firestore | Live crowd positions, amenity status |
| **Positioning** | GPS + BLE Beacons | Hybrid indoor/outdoor location tracking |
| **Hosting** | Firebase Hosting | Web deployment |
| **Cloud** | Google Cloud Run | Backend API serving |

---

## Project Structure

```
StadiumFlow/
├── frontend/               # React Native (Expo) app
│   └── src/
│       ├── components/     # StadiumMap (3D engine), UI overlays
│       ├── screens/        # MapScreen, LoginScreen
│       ├── utils/          # Pathfinding, GPS coordinates, venue data
│       └── services/       # Firebase configuration
├── backend/                # Node.js congestion engine
├── docs/                   # Architecture documentation
│   ├── HLD.md              # High-Level Design
│   ├── LLD.md              # Low-Level Design
│   ├── design.md           # UI/UX Design Philosophy
│   └── description.md      # Project Synopsis
└── package.json            # Workspace root
```

---

## Quick Start

```bash
# Install all dependencies (root, frontend, backend)
npm install

# Launch the app (opens Expo dev server)
npm run start:ui

# Clean all node_modules if needed
npm run clean
```

**Live Web Demo:** [https://disco-dispatch-493610-i4.web.app](https://disco-dispatch-493610-i4.web.app)

---

## Documentation

- **[High-Level Design](./docs/HLD.md)** — System architecture and component interaction
- **[Low-Level Design](./docs/LLD.md)** — Pathfinding algorithms, coordinate mapping, data schemas
- **[UI/UX Design](./docs/design.md)** — Visual philosophy and interaction patterns
- **[Project Synopsis](./docs/description.md)** — Executive summary of the concept

---

## The Vision

StadiumFlow is not just a map — it's a **crowd intelligence platform**. Deploy BLE beacons at any mega venue (stadiums, airports, convention centers, malls), connect them to StadiumFlow's engine, and instantly give every visitor the power to:

- **See** where crowds are building before walking into them
- **Navigate** to the fastest alternative in one tap
- **Save** 15-20 minutes per visit on average

For operators, it means **safer venues**, **higher food & beverage revenue** (fans actually visit stalls when queues are short), and **data-driven event planning** from real crowd flow analytics.

---

*Built for the Hackathon — solving real problems for 130,000 fans.*
