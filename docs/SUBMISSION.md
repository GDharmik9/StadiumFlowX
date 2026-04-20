# StadiumFlow — Hackathon Submission

---

## 🔗 Live Preview

**[https://disco-dispatch-493610-i4.web.app](https://disco-dispatch-493610-i4.web.app)**

Open the link above in any browser to experience the full 3D Digital Twin with real-time crowd simulation, congestion alerts, and smart rerouting.

**GitHub Repository:** [https://github.com/GDharmik9/StadiumFlow](https://github.com/GDharmik9/StadiumFlow)

### 🎬 Video Walkthrough

[preview.mp4](./preview.mp4)

---

## 📖 Narrative

### The Problem We're Solving

Picture this: You're one of 130,000 fans at the Narendra Modi Stadium in Ahmedabad. It's halftime. You need a washroom. You walk 5 minutes to the nearest one — and find a queue of 200 people stretching down the corridor. Meanwhile, there's another washroom 100 meters in the other direction that's completely empty. But you had no way of knowing that.

**This is the crowd blindness problem.** In mega venues — stadiums, airports, concert arenas — tens of thousands of people make navigation decisions with zero information about where everyone else is. The result:

- ⏱️ Fans waste **15–20 minutes** per visit stuck in avoidable queues
- 🚨 Corridors become **dangerously congested** at pinch points
- 💰 Operators lose **food & beverage revenue** because fans skip packed stalls
- 😤 Fan satisfaction drops, and they stop coming back

### Our Solution — StadiumFlow

StadiumFlow gives every fan **x-ray vision into crowd density**, and intelligently routes them away from congestion in real-time.

**Step 1: Know where everyone is.**
We use a hybrid positioning system — **GPS** for outdoor areas (gates, parking lots, open concourses) and **Bluetooth Low Energy (BLE) beacons** for indoor zones (corridors, washrooms, food courts) where GPS can't reach. By fusing both signals, we pinpoint every fan's location to within ~2 meters, anywhere in the venue.

**Step 2: Compute congestion live.**
Our cloud engine (Firebase + Node.js) continuously aggregates anonymized fan positions and calculates a congestion score for every amenity zone. Each zone is classified in real-time:
- 🟢 **Green** — Walk right in, no crowd
- 🟠 **Orange** — Some activity, short wait expected
- 🔴 **Red** — Critical congestion, 15+ minute wait

**Step 3: Alert and reroute.**
When a fan approaches or selects a congested zone:
1. Their phone **vibrates** with haptic feedback — a physical warning
2. A full-screen **Congestion Warning** overlay appears with estimated wait times
3. The app suggests an **uncongested alternative** of the same type
4. One tap draws a **navigation path** to the better option on the 3D map

The fan saves time. The overcrowded zone gets natural relief. Stadium operators get smoother crowd flow without hiring more staff.

### What Makes This Different

Most stadium apps give you a flat map and a list of amenities. StadiumFlow gives you a **living, breathing 3D digital twin** of the entire venue that shows you:

- **Where the crowd IS** (colored dots moving in real-time)
- **Where the crowd ISN'T** (green zones you should head to)
- **How to get there** (turn-by-turn navigation along actual walkable paths)

We don't just show data — we **solve the problem** by actively rerouting fans before they walk into trouble.

### The Demo

Our live demo simulates a match day at the Narendra Modi Stadium:

1. **3D Satellite Map** — The stadium rendered with real satellite imagery and 3D building extrusions (16 seating blocks, accurate positioning)
2. **Labeled Amenity Pins** — Every food court, washroom, medical center, water station, and entry gate clearly labeled on the map
3. **Live AI Crowd** — 10 autonomous agents walking the concourse in real-time, demonstrating natural crowd flow patterns
4. **Dual-Layer View** — Toggle between "Seating (L1)" to see 3D building blocks and "Concourse (L0)" to see amenity pins + crowd
5. **Congestion Alert Flow** — Tap a red/orange amenity → phone vibrates → warning overlay → one-tap reroute to uncongested alternative
6. **Smart Navigation** — Blue routing lines drawn on the 3D map, constrained to the stadium's walkable concourse ring

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile App | React Native (Expo) — iOS, Android, Web |
| 3D Map | MapLibre GL JS — satellite tiles + vector extrusions |
| Backend | Node.js + Firebase Cloud |
| Database | Firestore — real-time sync |
| Positioning | GPS + Bluetooth Low Energy beacons |
| Hosting | Firebase Hosting + Google Cloud Run |

### Impact & Scale

- **For Fans:** Save 15–20 minutes per stadium visit. Never walk into a packed zone again.
- **For Operators:** Reduce dangerous bottlenecks. Increase food & beverage revenue by 10–15% (fans actually visit stalls when they see short queues). Get real crowd flow analytics for event planning.
- **For Safety Teams:** Live density monitoring across all zones. Early warning when any area approaches capacity limits.

StadiumFlow works at any mega venue — stadiums, airports, convention centers, shopping malls. Install BLE beacons, connect to our engine, and every visitor gets intelligent crowd-aware navigation.

---

*Built by Team StadiumFlow — turning crowd chaos into crowd intelligence.*
