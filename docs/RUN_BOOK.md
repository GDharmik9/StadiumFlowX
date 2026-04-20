# StadiumFlow: Run Book 🏟️

Welcome to the StadiumFlow Development Monorepo. This codebase is split into two integrated environments: the React Native Mobile UI (`frontend`) and the Firebase-connected Node.js Engine (`backend`).

## 1. Initial Setup
Because this repository utilizes **NPM Workspaces**, you only need to run a single install command from the root directory to provision dependencies across the entire project.

Open your terminal in the root `StadiumFlow` directory and run:
```bash
npm install
```

---

## 2. Running the Backend Server
The backend simulates stadium crowd data or actively polls Firebase to emit real-time congestion alerts. 

To start the backend locally:
```bash
npm run start:server
```
*Note: Make sure your `gcloud` CLI is logged in so it securely inherits your Application Default Credentials for Firebase Admin.*

---

## 3. Running the Mobile UI
The frontend is an Expo-managed React Native application. It implements dynamic map layers and hooks directly into Firestore for UI state tracking. 

To start the UI Metro bundler:
```bash
npm run start:ui
```

If you are connecting an Android emulator, you can boot it directly via:
```bash
npm run android
```

---

## 4. Troubleshooting
- If you encounter a Firebase Auth Error inside the Mobile UI, verify you've manually logged into the Firebase Web Console and turned **ON** the "Anonymous Login" Provider.
- If the Backend crashes on launch stating `Error: Could not load the default credentials`, ensure your current terminal session has run `gcloud auth application-default login`.
