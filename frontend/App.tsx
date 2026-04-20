import React, { useEffect, useState } from 'react';
import { View, Text, Alert, SafeAreaView, Platform } from 'react-native';
import { db, auth } from './src/services/firebaseConfig';
import { doc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
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
  
  // Default Spawn Path Array (Gate_1 to Zone A)
  const defaultPath = [{x: 500,y: 950}, {x: 500,y: 800}, {x: 450,y: 750}];
  const [navigationPath, setNavigationPath] = useState(defaultPath);

  useEffect(() => {
    // 1. Silent Auth Initialization (overridden rules protect against timeouts)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setCurrentView('role_select');
      } else {
        signInAnonymously(auth).catch(err => console.error(err));
      }
    });

    // 2. Global Amenity Array Polling Layer (Re-syncs map when Scenarios run)
    const unsubZones = onSnapshot(collection(db, "stadium_zones"), (snapshot) => {
      const zonesRaw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStadiumZones(zonesRaw);
    });
    
    return () => { unsubZones(); unsubscribeAuth(); };
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

  // Viewport structural Wrapper protecting notch interference 
  const RouteWrapper = ({ children }: { children: React.ReactNode }) => (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? 25 : 0 }}>
          {children}
      </SafeAreaView>
  );

  // ==============================
  // RENDER ROUTING
  // ==============================
  if (currentView === 'auth') {
    return <RouteWrapper><View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Initializing Secure Session...</Text></View></RouteWrapper>;
  }

  if (currentView === 'role_select') {
    return (
      <RouteWrapper>
        <RoleSelector uid={uid!} onRoleSelected={(roleId) => {
            setActiveRole(roleId);
            setNavigationPath(defaultPath); // reset bounds
            setCurrentView('dashboard');
        }} />
      </RouteWrapper>
    );
  }

  if (currentView === 'dashboard') {
    return (
        <RouteWrapper>
            <Dashboard 
                testerId={activeRole!} 
                onEnterStadium={() => setCurrentView('simulation')} 
                onGoBack={() => setCurrentView('role_select')}
            />
        </RouteWrapper>
    );
  }

   if (currentView === 'simulation') {
      // Filter the 'Gate_1' data specifically for the old Traffic bar
      const entranceData = stadiumZones.find(z => z.id === 'Gate_1') || { current_pings: 0, capacity: 10 };
      
      return (
        <RouteWrapper>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Decoupled Back Nav strictly avoiding Status Bar conflicts */}
            <View style={{flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center'}}>
                <Text style={{color:'#007AFF', fontWeight:'bold', fontSize:16}} onPress={() => setCurrentView('dashboard')}>
                     {"< Exit Simulation"}
                </Text>
            </View>
            <TrafficStatusBar currentPings={entranceData.current_pings} capacity={entranceData.capacity} />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <StadiumMap 
                 userLocation={{ x: 500, y: 950 }} 
                 navigationPath={navigationPath} 
                 stadiumZones={stadiumZones}
                 onReroute={(newTarget: any) => {
                     // Array Route overriding algorithm bypassing Center trajectory securely
                     const safeCurveArray = getPath({x: 500, y: 950}, newTarget);
                     setNavigationPath(safeCurveArray);
                 }}
              />
            </View>
          </View>
        </RouteWrapper>
      );
  }
  
  return null;
}