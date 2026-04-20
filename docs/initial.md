# StadiumFlow: Initial Milestone Documentation

## Overview
This document summarizes the established architecture, components, and services for the **StadiumFlow** project. It serves as a baseline mapping the current progress consisting of frontend logic, real-time backend updates, and database integration.

---

## 1. Firebase Integration & Database Layer
- **Environment**: Firebase (Firestore)
- **Project ID**: `disco-dispatch-493610-i4`
- **Frontend Connection**: Uses the modular Firebase v9 SDK (`src/services/firebaseConfig.ts`). It communicates directly with Firestore to update UI based on document changes.
- **Backend Connection**: Utilizes the Firebase Admin SDK inside a server environment verified using Google Application Default Credentials.
- **Data Models**:
  - `users/{userId}`: Stores positional coordinates (x, y) accessed in real-time.
  - `stadium_zones/{zoneId}`: Stores zone information, particularly `capacity` and `current_pings`, allowing calculations for congestion density.

## 2. Frontend App (`StadiumFlow`)
- **Technology Stack**: React Native (Expo).
- **Core Components**:
  - **`MapScreen.tsx`**: The main interface view. It implements an `onSnapshot` real-time listener hooking into Firestore (`users/my_test_user`). When coordinate data changes, it updates the local state mapping the screen.
  - **`StadiumMap.tsx`**: Renders the visually responsive Narendra Modi Stadium layout. It overlays SVG components dynamically, specifically dropping a user marker (`userDot`) translated proportionally utilizing normalized coordinates (a `0-1000` grid).
  - **`TrafficStatusBar.tsx`**: A conditional notification tracker element that adjusts visually if traffic ratios hit a congestion threshold (`0.8` or 80%). It will highlight red for heavy congestion and green if the gates are clear.
  - **`NavigationPath.tsx`**: Handles mapping `waypoints` through SVG `Polyline` paths to create dotted directional routes indicating paths towards seating vectors.

## 3. Backend Engine (`stadiumflow-backend`)
- **Technology Stack**: Node.js/Express.js instance built for deployment on **Google Cloud Run**.
- **Engine Logic**:
  - Contains a continuous polling interval interval executing every *10 seconds*.
  - Assesses `stadium_zones` in Firestore and extracts live ping-to-capacity proportions.
  - Calculates the real-time congestion ratio (`current_pings / capacity`). If density exceeds 80% (`> 0.8`), it triggers a server-side congestion alert block, setting down the foundations for pushing push-notification systems out.
  - Keeps a simple HTTP GET endpoint (`/`) open acting as a health-check responder (`StadiumFlow Engine is running`).

---

## Preparation and Ideas for Next Changes
1. **Push Notifications Linking**: Tie the backend Cloud Run `stadium_zones` alerts explicitly to an FCM (Firebase Cloud Messaging) payload to fire direct network requests so the frontend receives "Heavy Traffic" native background popups.
2. **Frontend `TrafficStatusBar` Hookup**: Drive the `TrafficStatusBar` states dynamically by hooking it to a Firestore listener watching the `stadium_zones` rather than keeping properties static.
3. **Advanced Path Generation**: Introduce active directional routing that will draw `navigationPath` polylines directly from individual user locations toward specific seats or amenities.
4. **Enhanced UI Scaling**: Validate SVG and point locations effectively on multi-resolution tablet and varied mobile device sizes via `Dimensions`.
