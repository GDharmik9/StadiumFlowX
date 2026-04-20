import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from './src/services/firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, setDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { TrafficStatusBar } from './src/components/TrafficStatusBar';
import { StadiumMap } from './src/components/StadiumMap';
import { RoleSelector } from './src/components/RoleSelector';
import { Dashboard } from './src/components/Dashboard';
import { getPath } from './src/utils/pathfinding';

export default function App() {
  // Use arrays mapping all locations from Firebase dynamically
  const [stadiumZones, setStadiumZones] = useState<any[]>([]);
  
  // High-Level View Router Switch
  const [currentView, setCurrentView] = useState<'auth' | 'role_select' | 'dashboard' | 'simulation'>('auth');
  
  const [uid, setUid] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]); // Tracking Ghost Agents natively
  
  // 10 Simulated User Data Sets mapping Hierarchical seating and routing
  const initialUserRoutes: any = {
      1: { start: {x: 500, y: 950}, dest: {x: 500, y: 850}, seat: 'South Premium Suites Lower' },
      2: { start: {x: 500, y: 50}, dest: {x: 500, y: 150}, seat: 'North Corporate Box Upper' },
      3: { start: {x: 500, y: 950}, dest: {x: 150, y: 200}, seat: 'Block J (Upper Block)' },
      4: { start: {x: 500, y: 950}, dest: {x: 350, y: 850}, seat: 'Jio Block L Lower' },
      5: { start: {x: 500, y: 50}, dest: {x: 850, y: 500}, seat: 'Block Q (BKT Tyres) Lower' },
      6: { start: {x: 500, y: 50}, dest: {x: 650, y: 200}, seat: 'Torrent Group Block M Middle' },
      7: { start: {x: 500, y: 950}, dest: {x: 500, y: 750}, seat: 'President Gallery Lower' },
      8: { start: {x: 500, y: 950}, dest: {x: 150, y: 500}, seat: 'Block K (Upper Block)' },
      9: { start: {x: 500, y: 50}, dest: {x: 850, y: 800}, seat: 'Block R (BKT Tyres) Upper' },
      10: { start: {x: 500, y: 950}, dest: {x: 650, y: 850}, seat: 'Equitas Bank Block Middle' }
  };

  const [userLocation, setUserLocation] = useState<any>({x: 500, y: 500});
  const [navigationPath, setNavigationPath] = useState<any[]>([]);
  const [ticketTarget, setTicketTarget] = useState<any>(null);

  useEffect(() => {
    // 1. Silent Auth Initialization hooking Ticket Assignment seamlessly bypassing obsolete UI menus
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        if(!activeRole) {
            const assignedId = Math.floor(Math.random() * 10) + 1;
            const roleStr = `User_${assignedId}`;
            const routeMeta = initialUserRoutes[assignedId];
            
            await setDoc(doc(db, "users", roleStr), {
                tester_id: roleStr,
                uid: user.uid,
                hasEntered: true,
                target_seat_id: routeMeta.seat,
                current_coords: routeMeta.start
            });
            
            setActiveRole(roleStr);
            setUserLocation(routeMeta.start);
            setTicketTarget(routeMeta.dest);
            setNavigationPath(getPath(routeMeta.start, routeMeta.dest));
            setCurrentView('dashboard');
        }
      } else {
        signInAnonymously(auth).catch(err => console.error(err));
      }
    });

    // 2. Global Amenity Array Polling Layer (Re-syncs map when Scenarios run)
    const unsubZones = onSnapshot(collection(db, "stadium_zones"), (snapshot) => {
      const zonesRaw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStadiumZones(zonesRaw);
    });

    // 3. Sync Active Ecosystem Entities mapping concurrent Fan personas universally 
    const unsubGhosts = onSnapshot(collection(db, "users"), (snapshot) => {
        const payload = snapshot.docs.map(d => d.data());
        setAllUsers(payload);
    });
    
    return () => { unsubZones(); unsubGhosts(); unsubscribeAuth(); };
  }, []);

  // 3. Script Engine Alert Receiver hook
  useEffect(() => {
    if (activeRole) {
       const userDocRef = doc(db, "users", activeRole);
       const unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.notification) {
                  Alert.alert("🚨 Active Redirect Initiated", data.notification, [{ text: "Understood" }]);
                  updateDoc(userDocRef, { notification: null }).catch(err => console.error(err));
              }
          }
       });
       return () => unsubUser();
    }
  }, [activeRole]);

  // Viewport structural Wrapper projecting strict boundary limits accommodating physical Pixels
  const RouteWrapper = ({ children }: { children: React.ReactNode }) => (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
          {children}
      </SafeAreaView>
  );

  // ==============================
  // RENDER ROUTING (Wrapped safely inside Context Providers)
  // ==============================
  return (
    <SafeAreaProvider>
      {currentView === 'auth' && (
          <RouteWrapper><View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Initializing Secure Session...</Text></View></RouteWrapper>
      )}

      {currentView === 'role_select' && (
          <RouteWrapper>
            <RoleSelector uid={uid!} onRoleSelected={(roleId) => {
                setActiveRole(roleId);
                setCurrentView('dashboard');
            }} />
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
                 allUsers={allUsers} // Tunneling ghosts ecosystem strictly directly over bridge 
                 activeRole={activeRole!}
                 onReroute={(newTarget: any) => {
                     const safeCurveArray = getPath(userLocation, newTarget);
                     setNavigationPath(safeCurveArray);
                 }}
                 onTeleport={(newCoords: any) => {
                     setUserLocation(newCoords);
                     setNavigationPath([]); 
                 }}
                 onExit={() => setCurrentView('dashboard')}
              />
          </View>
      )}
    </SafeAreaProvider>
  );
}