/**
 * StadiumFlow — Real-time Crowd Congestion Detection App
 *
 * Root application component managing authentication, view routing,
 * and global state for the stadium digital twin experience.
 *
 * Architecture:
 * - Auth: Firebase Anonymous Authentication
 * - Data: Firestore real-time listeners for zones, users, and notifications
 * - Views: auth → dashboard → simulation (3D map)
 *
 * @module App
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from './src/services/firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, setDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { StadiumMap } from './src/components/StadiumMap';
import { RoleSelector } from './src/components/RoleSelector';
import { Dashboard } from './src/components/Dashboard';
import { getPath } from './src/utils/pathfinding';
import type {
  AppView,
  VirtualCoordinate,
  StadiumZone,
  StadiumUser,
  UserRoute,
} from './src/types';

// ─────────────────────────────────────────────
// Constants: Simulated User Routes
// ─────────────────────────────────────────────

/** Route configurations for 10 simulated fan personas */
const USER_ROUTES: Readonly<Record<number, UserRoute>> = Object.freeze({
  1: { start: { x: 500, y: 950 }, dest: { x: 500, y: 850 }, seat: 'South Premium Suites Lower' },
  2: { start: { x: 500, y: 50 }, dest: { x: 500, y: 150 }, seat: 'North Corporate Box Upper' },
  3: { start: { x: 500, y: 950 }, dest: { x: 150, y: 200 }, seat: 'Block J (Upper Block)' },
  4: { start: { x: 500, y: 950 }, dest: { x: 350, y: 850 }, seat: 'Jio Block L Lower' },
  5: { start: { x: 500, y: 50 }, dest: { x: 850, y: 500 }, seat: 'Block Q (BKT Tyres) Lower' },
  6: { start: { x: 500, y: 50 }, dest: { x: 650, y: 200 }, seat: 'Torrent Group Block M Middle' },
  7: { start: { x: 500, y: 950 }, dest: { x: 500, y: 750 }, seat: 'President Gallery Lower' },
  8: { start: { x: 500, y: 950 }, dest: { x: 150, y: 500 }, seat: 'Block K (Upper Block)' },
  9: { start: { x: 500, y: 50 }, dest: { x: 850, y: 800 }, seat: 'Block R (BKT Tyres) Upper' },
  10: { start: { x: 500, y: 950 }, dest: { x: 650, y: 850 }, seat: 'Equitas Bank Block Middle' },
});

// ─────────────────────────────────────────────
// App Component
// ─────────────────────────────────────────────

export default function App() {
  const [stadiumZones, setStadiumZones] = useState<StadiumZone[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('auth');
  const [uid, setUid] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<StadiumUser[]>([]);
  const [userLocation, setUserLocation] = useState<VirtualCoordinate>({ x: 500, y: 500 });
  const [navigationPath, setNavigationPath] = useState<VirtualCoordinate[]>([]);
  const [ticketTarget, setTicketTarget] = useState<VirtualCoordinate | null>(null);

  // ─── Firebase Auth + Route Assignment ──────
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        if (!activeRole) {
          const assignedId = Math.floor(Math.random() * 10) + 1;
          const roleStr = `User_${assignedId}`;
          const routeMeta = USER_ROUTES[assignedId];

          try {
            await setDoc(doc(db, 'users', roleStr), {
              tester_id: roleStr,
              uid: user.uid,
              hasEntered: true,
              target_seat_id: routeMeta.seat,
              current_coords: routeMeta.start,
            });

            setActiveRole(roleStr);
            setUserLocation(routeMeta.start);
            setTicketTarget(routeMeta.dest);
            setNavigationPath(getPath(routeMeta.start, routeMeta.dest));
            setCurrentView('dashboard');
          } catch (error) {
            console.error('Failed to assign user role:', error);
          }
        }
      } else {
        signInAnonymously(auth).catch((err) => console.error('Anonymous auth failed:', err));
      }
    });

    // Real-time zone status listener
    const unsubZones = onSnapshot(
      collection(db, 'stadium_zones'),
      (snapshot) => {
        const zonesRaw = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as StadiumZone[];
        setStadiumZones(zonesRaw);
      },
      (error) => console.error('Zone listener error:', error)
    );

    // Real-time user positions listener
    const unsubGhosts = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const payload = snapshot.docs.map((d) => d.data()) as StadiumUser[];
        setAllUsers(payload);
      },
      (error) => console.error('User listener error:', error)
    );

    return () => {
      unsubZones();
      unsubGhosts();
      unsubscribeAuth();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Notification Receiver ─────────────────
  useEffect(() => {
    if (!activeRole) return;

    const userDocRef = doc(db, 'users', activeRole);
    const unsubUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notification) {
            Alert.alert('🚨 Active Redirect Initiated', data.notification, [{ text: 'Understood' }]);
            updateDoc(userDocRef, { notification: null }).catch((err) =>
              console.error('Failed to clear notification:', err)
            );
          }
        }
      },
      (error) => console.error('User notification listener error:', error)
    );

    return () => unsubUser();
  }, [activeRole]);

  // ─── Navigation Handlers ───────────────────
  const handleReroute = useCallback(
    (newTarget: VirtualCoordinate) => {
      const safePath = getPath(userLocation, newTarget);
      setNavigationPath(safePath);
    },
    [userLocation]
  );

  const handleTeleport = useCallback((newCoords: VirtualCoordinate) => {
    setUserLocation(newCoords);
    setNavigationPath([]);
  }, []);

  // ─── Layout Wrapper ────────────────────────
  const RouteWrapper = useMemo(
    () =>
      ({ children }: { children: React.ReactNode }) => (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: '#fff' }}
          edges={['top', 'left', 'right']}
          accessible={true}
        >
          {children}
        </SafeAreaView>
      ),
    []
  );

  // ─── Render ────────────────────────────────
  return (
    <SafeAreaProvider>
      {currentView === 'auth' && (
        <RouteWrapper>
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            accessible={true}
            accessibilityLabel="Initializing secure session"
            accessibilityRole="progressbar"
          >
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#555' }}>
              Initializing Secure Session...
            </Text>
          </View>
        </RouteWrapper>
      )}

      {currentView === 'role_select' && (
        <RouteWrapper>
          <RoleSelector
            uid={uid!}
            onRoleSelected={(roleId) => {
              setActiveRole(roleId);
              setCurrentView('dashboard');
            }}
          />
        </RouteWrapper>
      )}

      {currentView === 'dashboard' && (
        <RouteWrapper>
          <Dashboard
            testerId={activeRole!}
            onEnterStadium={() => setCurrentView('simulation')}
            onGoBack={() => setCurrentView('role_select')}
          />
        </RouteWrapper>
      )}

      {currentView === 'simulation' && (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <StadiumMap
            userLocation={userLocation}
            ticketTarget={ticketTarget}
            navigationPath={navigationPath}
            stadiumZones={stadiumZones}
            allUsers={allUsers}
            activeRole={activeRole!}
            onReroute={handleReroute}
            onTeleport={handleTeleport}
            onExit={() => setCurrentView('dashboard')}
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}