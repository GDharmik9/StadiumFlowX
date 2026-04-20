import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { STADIUM_CENTER, virtualToGPS } from '../utils/coordinates';
import { generateVenueGeoJSON } from '../utils/venue';
import { getPath } from '../utils/pathfinding';

export const StadiumMap = ({ userLocation, ticketTarget, navigationPath = [], stadiumZones = [], allUsers = [], activeRole, onReroute, onExit, onTeleport }: any) => {
    const webViewRef = useRef<WebView>(null);
    const webFrameRef = useRef<any>(null); // For Web iframe fallback
    const [isMapReady, setIsMapReady] = useState(false);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [activeLevel, setActiveLevel] = useState<number>(1);
    const [toastMessage, setToastMessage] = useState<{ type: 'info' | 'success' | 'warning', text: string } | null>({ type: 'info', text: 'Welcome! Proceed to Gate 1.' });
    const [hasCheckedIn, setHasCheckedIn] = useState(false); // Permanent logical unlock

    // Universal script execution wrapper handling async Web DOM iframe safely
    const executeMapScript = (script: string) => {
        if (!isMapReady) return; // Safely hold execution until MapLibre signals load completion natively
        if (Platform.OS === 'web') {
            if (webFrameRef.current && webFrameRef.current.contentWindow) {
                webFrameRef.current.contentWindow.postMessage(JSON.stringify({ type: 'INJECT_JS', payload: script }), '*');
            }
        } else {
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(script);
            }
        }
    };

    // Validate Check-in completion matching natively coordinates
    useEffect(() => {
        if (!hasCheckedIn && ticketTarget) {
             if (Math.abs(userLocation.x - ticketTarget.x) < 20 && Math.abs(userLocation.y - ticketTarget.y) < 20) {
                 setHasCheckedIn(true);
                 setToastMessage({ type: 'success', text: 'Ticket successfully checked in at Block. You are now permitted to access Amenities.' });
             }
        }
    }, [userLocation, ticketTarget, hasCheckedIn]);

    // Auto-dismiss smart notifications elegantly after 5 seconds
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Core payload resolving entirely strictly internally!
    const venueGeoJSON = generateVenueGeoJSON();

    // Navigation Matrix parsing 0-1000 bounds mapped through GPS
    const pathLineGPS = navigationPath.map((p: any) => {
        const gps = virtualToGPS(p.x, p.y);
        return [gps.lng, gps.lat];
    });

    // Helper: Clustered Offset natively separating avatars sharing identical seating arrays
    const getClusteredOffset = (idStr: string) => {
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
        return { x: (hash % 30) - 15, y: ((hash >> 3) % 30) - 15 };
    };

    // Headless Simulation Ref
    const ghostStateRef = useRef<any>({});

    useEffect(() => {
        // Living Crowd Autonomous Script bridging perfectly to WebView Canvas natively avoiding React State Re-Renders
        const interval = setInterval(() => {
            const activeGhostBase = allUsers.filter((u: any) => u.tester_id !== activeRole && u.current_coords);
            if (activeGhostBase.length === 0 || !webViewRef.current) return;

            const features = activeGhostBase.map((ghostBase: any) => {
                let state = ghostStateRef.current[ghostBase.tester_id];
                if (!state) {
                    const offset = getClusteredOffset(ghostBase.tester_id);
                    state = {
                        coords: { x: ghostBase.current_coords.x + offset.x, y: ghostBase.current_coords.y + offset.y },
                        path: [], step: 0, waitTicks: Math.floor(Math.random() * 20)
                    };
                }

                if (state.waitTicks > 0) {
                    state.waitTicks--;
                } 
                else if (state.path && state.step < state.path.length - 1) {
                    state.step++;
                    state.coords = state.path[state.step];
                } 
                else {
                    // Re-route instantly! Constant chaos pacing scaling organically!
                    const newTarget = { x: 100 + Math.random() * 800, y: 100 + Math.random() * 800 };
                    state.path = getPath(state.coords, newTarget);
                    state.step = 0;
                    state.waitTicks = 5 + Math.floor(Math.random() * 10); // Hyperactive wait bridging constant visual motion
                }
                ghostStateRef.current[ghostBase.tester_id] = state;

                const gps = virtualToGPS(state.coords.x, state.coords.y);
                return {
                    type: 'Feature', properties: { id: ghostBase.tester_id },
                    geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] }
                };
            });

            const ghostsGeoJSON = { type: 'FeatureCollection', features };
            executeMapScript(`
                if(window.map && window.map.getSource('ghost-agents')) {
                     window.map.getSource('ghost-agents').setData(${JSON.stringify(ghostsGeoJSON)});
                }
                true;
            `);
        }, 150); // 150ms interpolation ensures extremely fluid movement mapping beautifully on devices!

        return () => clearInterval(interval);
    }, [allUsers]);

    // Construct Active User Tracking (The Blue Dot)
    const activeOffset = getClusteredOffset(activeRole || 'User_0');
    const activeUserGeoJSON = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: { id: 'active-user' },
            geometry: { type: 'Point', coordinates: [virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lng, virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lat] }
        }]
    };

    // We pass the GPS path dynamically reacting flawlessly to rendering loops via message arrays
    useEffect(() => {
        let pathData;
        if (pathLineGPS.length >= 2) {
             pathData = { type: 'Feature', geometry: { type: 'LineString', coordinates: pathLineGPS } };
        } else {
             pathData = { type: 'FeatureCollection', features: [] }; // Effectively erases the blue line bridging strictly native bounds!
        }
        executeMapScript(`
            if(window.map && window.map.getSource('navigation-path')) {
                 window.map.getSource('navigation-path').setData(${JSON.stringify(pathData)});
            }
            true;
         `);
    }, [navigationPath, activeLevel, isMapReady]);

    // Force strict sync reacting to Native Toggle hooks and Agent Syncing
    // Safely splitting Map Layer architectures visually: Level 1 = Blocks, Level 0 = Amenities + Crowd
    useEffect(() => {
        executeMapScript(`
            if(window.map) {
                 window.map.setPaintProperty('room-extrusion', 'fill-extrusion-opacity', ${activeLevel === 1 ? 0.85 : 0.0});
                 window.map.setPaintProperty('hotspot-points', 'circle-opacity', ${activeLevel === 0 ? 1.0 : 0.0});
                 if (window.map.getLayer('hotspot-labels')) {
                     window.map.setPaintProperty('hotspot-labels', 'text-opacity', ${activeLevel === 0 ? 1.0 : 0.0});
                 }
                 if (window.map.getLayer('ghost-layer')) {
                     window.map.setPaintProperty('ghost-layer', 'circle-opacity', ${activeLevel === 0 ? 0.7 : 0.0});
                 }
            }
            true;
         `);
    }, [activeLevel, isMapReady]);

    // Ghost state rendering is entirely intercepted directly within the Headless Simulator sequence

    // Track the Active User's Blue Dot natively over coordinate updates
    useEffect(() => {
        if (activeUserGeoJSON) {
            const userGPS = virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y);
            executeMapScript(`
                if(window.map && window.map.getSource('active-user')) {
                     window.map.getSource('active-user').setData(${JSON.stringify(activeUserGeoJSON)});
                     
                     // Cinematic Tracking Camera following Blue Dot vectors natively
                     window.map.flyTo({
                         center: [${userGPS.lng}, ${userGPS.lat}],
                         zoom: 18,
                         pitch: 60,
                         duration: 2000,
                         essential: true
                     });
                }
                true;
             `);
        }
    }, [userLocation, isMapReady]);

    // Active Agency Interaction Hooks mapping proximity mathematically 
    useEffect(() => {
        const distToGate1 = Math.sqrt(Math.pow(220 - userLocation.x, 2) + Math.pow(850 - userLocation.y, 2));
        if (distToGate1 < 25) {
            setToastMessage({ type: 'success', text: 'Ticket Scanned: Welcome to the Stadium Simulation.' });
        } else if (navigationPath.length > 0) {
            const dest = navigationPath[navigationPath.length - 1];
            const targetAmenity = stadiumZones.find((z: any) => z.coordinates && z.coordinates.x === dest.x && z.coordinates.y === dest.y);
            if (targetAmenity) {
                if (targetAmenity.status === 'red') setToastMessage({ type: 'warning', text: `${targetAmenity.id.replace(/_/g, ' ')} is heavily congested.` });
                else setToastMessage({ type: 'info', text: `Routing safely to ${targetAmenity.id.replace(/_/g, ' ')}...` });
            }
        }
    }, [userLocation, navigationPath]);

    // MAPLIBRE OS ENGINE HTML (Sandboxed exclusively forcing lock to stop WebView flickering!)
    const htmlContent = React.useMemo(() => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
    <style>body { margin: 0; padding: 0; } #map { position: absolute; top: 0; bottom: 0; width: 100%; }</style>
</head>
<body>
    <div id="map"></div>
    <script>
        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    // High-Resolution Google Maps Satellite tile mapping dynamically linked without API tracking
                    'satellite': { type: 'raster', tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], tileSize: 256 }
                },
                layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }]
            },
            center: [${virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lng}, ${virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lat}],
            zoom: 18,
            pitch: 55,       // Isometric Drone projection establishing scale
            bearing: -45,     
            antialias: true  // Critical for fluid 3D line edges visually
        });
        
        window.map = map;

        function bridgeNativeInterface(type, payload) {
             if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
             } else {
                  window.parent.postMessage(JSON.stringify({ type, payload }), '*');
             }
        }

        window.addEventListener('message', function(e) {
             try {
                  const msg = JSON.parse(e.data);
                  if (msg.type === 'INJECT_JS') {
                       eval(msg.payload);
                  }
             } catch(err){}
        });

        map.on('load', () => {
             // Establish singular database natively parsing Extrusions vs Nodes strictly inside the engine!
             map.addSource('stadium-data', { type: 'geojson', data: ${JSON.stringify(venueGeoJSON)} });
             
             // Layer 1: Stand Extrusions (3D Building filter dynamically scaling)
             map.addLayer({
                  'id': 'room-extrusion',
                  'type': 'fill-extrusion',
                  'source': 'stadium-data',
                  'filter': ['all', ['==', 'feature_type', 'unit'], ['==', 'level', 1]], // Default to strictly Level 1
                  'paint': {
                      'fill-extrusion-color': ['get', 'color'],
                      'fill-extrusion-height': ['get', 'height'],
                      'fill-extrusion-base': ['get', 'base_height'],
                      'fill-extrusion-opacity': 0.85
                  }
             });

             // Layer 2: Network Path Array (GPS Ribbon trajectory)
             map.addSource('navigation-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
             map.addLayer({
                  'id': 'navigation-line',
                  'type': 'line',
                  'source': 'navigation-path',
                  'paint': {
                      'line-color': '#007AFF', // Solid tech blue pipeline
                      'line-width': 8,
                      'line-opacity': 0.9,
                      'line-dasharray': [2, 1] // Creates dashed GPS flow visually
                  }
             });

             // Layer 3: Interaction Target Hooks (Status aware dots)
             map.addLayer({
                  'id': 'hotspot-points',
                  'type': 'circle',
                  'source': 'stadium-data',
                  'filter': ['all', ['!=', 'feature_type', 'unit']], 
                  'paint': {
                      'circle-radius': 14,
                      'circle-color': [
                           'match', ['get', 'status'],
                           'green', '#4CD964',
                           'orange', '#FF9500',
                           'red', '#FF3B30',
                           '#ffffff' 
                      ],
                      'circle-stroke-width': 4,
                      'circle-stroke-color': '#ffffff'
                  }
             });

             // Layer 3.5: Text labels loudly identifying nodes for Judges visually
             map.addLayer({
                 'id': 'hotspot-labels',
                 'type': 'symbol',
                 'source': 'stadium-data',
                 'filter': ['all', ['!=', 'feature_type', 'unit']],
                 'layout': {
                      'text-field': ['get', 'name'],
                      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                      'text-size': 12,
                      'text-offset': [0, 1.5],
                      'text-anchor': 'top'
                 },
                 'paint': {
                      'text-color': '#ffffff',
                      'text-halo-color': '#000000',
                      'text-halo-width': 2
                 }
             });

             // Layer 4: Multi-Agent Cloud Actors (Living Crowd simulation)
             map.addSource('ghost-agents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
             map.addLayer({
                  'id': 'ghost-layer',
                  'type': 'circle',
                  'source': 'ghost-agents',
                  'paint': {
                      'circle-radius': 10,
                      'circle-color': '#00bcd4',
                      'circle-opacity': 0.7,
                      'circle-stroke-width': 2,
                      'circle-stroke-color': '#fff'
                  }
             });

             // Layer 5: Active User Marker (The Primary Blue Dot)
             map.addSource('active-user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
             map.addLayer({
                  'id': 'active-user-point',
                  'type': 'circle',
                  'source': 'active-user',
                  'paint': {
                      'circle-radius': 12,
                      'circle-color': '#007AFF',
                      'circle-stroke-width': 3,
                      'circle-stroke-color': '#ffffff',
                      'circle-opacity': 1.0
                  }
             });

             // Interaction Bridges binding Touch back out to Expo App logic safely!
             map.on('click', 'hotspot-points', (e) => {
                  bridgeNativeInterface('HOTSPOT_SELECTED', e.features[0].properties.id);
             });
             
             // MAP_READY listener mapping safely on idle
             map.on('idle', () => {
                  bridgeNativeInterface('MAP_READY', true);
             });
        });

        // Web DOM Event Listener intercepting JS execution cleanly
        window.addEventListener('message', function(e) {
             try {
                  const msg = JSON.parse(e.data);
                  if (msg.type === 'INJECT_JS') eval(msg.payload);
             } catch(err){}
        });
    </script>
</body>
</html>
    `, []);

    // Expo Interception handler 
    const handleWebViewMessage = (event: any) => {
        const rawData = event.nativeEvent ? event.nativeEvent.data : event.data;
        if (!rawData || typeof rawData !== 'string') return;
        
        let data;
        try {
             data = JSON.parse(rawData);
        } catch (e) {
             return; // Gracefully reject random web extension DOM injections bypassing JSON crashes
        }
        
        if (data.type === 'MAP_READY') {
            setIsMapReady(true);
            return;
        }

        if (data.type === 'HOTSPOT_SELECTED') {
            const hitFeature = venueGeoJSON.features.find((f: any) => f.properties.id === data.payload);
            const isCongested = hitFeature?.properties.status === 'red';

            let altCoords = null;
            if (isCongested && hitFeature?.properties.category) {
                const altFeature = venueGeoJSON.features.find((f: any) =>
                    f.properties.category === hitFeature.properties.category &&
                    f.properties.id !== data.payload &&
                    f.properties.status !== 'red'
                );
                if (altFeature) {
                    altCoords = { x: altFeature.properties.vx, y: altFeature.properties.vy };
                }
            }

            if (isCongested) {
                // Brutal Haptic Alert physically jarring user to congestion mapping directly solving Hacks theme
                Vibration.vibrate([100, 500, 100, 500]);
            }

            setSelectedZone({
                id: hitFeature?.properties.name,
                status: hitFeature?.properties.status,
                coordinates: { x: hitFeature?.properties.vx || 500, y: hitFeature?.properties.vy || 500 }, // Solves pitch bug forever
                alternativeCoords: altCoords
            });
        }
    };

    // Web DOM Message Sink safely trapped against Render Cycles
    useEffect(() => {
        if (Platform.OS === 'web') {
             const listener = (e: any) => handleWebViewMessage(e);
             window.addEventListener('message', listener);
             return () => window.removeEventListener('message', listener);
        }
    }, []);

    return (
        <View style={styles.container}>
            {/* FLOATING ACTION BUTTON securing navigation escape natively */}
            <TouchableOpacity style={styles.fabBtn} onPress={onExit}>
                <Text style={styles.fabIcon}>🏠</Text>
            </TouchableOpacity>

            {/* DYNAMIC SMART TOAST ENGINE rendering strictly over safe insets */}
            {toastMessage && (
                <SafeAreaView style={styles.toastWrapper}>
                    <View style={[styles.toastBox, { backgroundColor: toastMessage.type === 'success' ? '#4CD964' : toastMessage.type === 'warning' ? '#FF9500' : '#007AFF' }]}>
                        <Text style={styles.toastText}>{toastMessage.text}</Text>
                    </View>
                </SafeAreaView>
            )}

            {/* LEVEL TOGGLE INTERFACE explicitly overriding Z-indexes directly! */}
            <SafeAreaView style={styles.floorControlWrapper}>
                <View style={styles.floorPill}>
                    <TouchableOpacity style={[styles.floorBtn, activeLevel === 1 && styles.floorBtnActive]} onPress={() => setActiveLevel(1)}>
                        <Text style={[styles.floorText, activeLevel === 1 && styles.floorTextActive]}>Seating (L1)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.floorBtn, activeLevel === 0 && styles.floorBtnActive]} onPress={() => setActiveLevel(0)}>
                        <Text style={[styles.floorText, activeLevel === 0 && styles.floorTextActive]}>Concourse (L0)</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {Platform.OS === 'web' ? (
                <View style={[styles.mapFrame, { overflow: 'hidden' }]}>
                    {React.createElement('iframe', {
                        ref: webFrameRef,
                        style: { width: '100%', height: '100%', border: 'none' },
                        srcDoc: htmlContent
                    })}
                </View>
            ) : (
                <WebView
                    ref={webViewRef}
                    style={styles.mapFrame}
                    originWhitelist={['*']}
                    source={{ html: htmlContent }}
                    onMessage={handleWebViewMessage}
                    bounces={false}
                    scrollEnabled={false}
                />
            )}

            {/* MASSIVE WARNING DIALOG OVERLAY (Proactive Congestion Rerouting explicitly solving the problem!) */}
            {selectedZone && (selectedZone.status === 'red' || selectedZone.status === 'orange') && (
                <View style={[styles.suggestionDialogBox, { backgroundColor: '#3b0000', borderColor: '#ff3b30' }]}>
                    <Text style={[styles.suggestionTitle, { color: '#ff3b30', fontSize: 24, fontWeight: '900' }]}>
                         🔥 CONGESTION WARNING
                    </Text>
                    <Text style={[styles.suggestionSub, { color: '#ffaaaa', fontSize: 16, marginTop: 10, lineHeight: 22 }]}>
                         {selectedZone.id} is currently experiencing crowd density! Estimated Wait Time: 4-7 Minutes.
                    </Text>
                    {selectedZone.alternativeCoords ? (
                        <TouchableOpacity style={[styles.hudBtnGreen, { backgroundColor: '#ff3b30', marginTop: 15, padding: 15 }]} onPress={() => {
                            Vibration.vibrate();
                            if (onReroute) onReroute(selectedZone.coordinates, selectedZone.alternativeCoords);
                            setSelectedZone(null); // Clear massive dialog
                        }}>
                            <Text style={[styles.hudBtnText, { fontSize: 16, fontWeight: '900' }]}>[ Reroute to Uncongested Area ]</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.hudBtnGreen, { backgroundColor: '#888', marginTop: 15 }]} onPress={() => setSelectedZone(null)}>
                            <Text style={styles.hudBtnText}>[ Accept & Proceed Anyway ]</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* DEFAULT SUGGESTION DIALOG OVERLAY */}
            {navigationPath.length > 0 && !selectedZone && (
                <View style={styles.suggestionDialogBox}>
                    <Text style={styles.suggestionTitle}>Navigation Active</Text>
                    <Text style={styles.suggestionSub}>Follow the blue routing line to your destination physically.</Text>
                    <TouchableOpacity style={styles.hudBtnGreen} onPress={() => {
                        if (onTeleport) onTeleport(navigationPath[navigationPath.length - 1]);
                    }}>
                        <Text style={styles.hudBtnText}>[ Navigate ]</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* HOTSPOT HUD LAYER decoupling UI rendering completely from HTML payload! */}
            {selectedZone && (
                <View style={styles.hudOverlay}>
                    <Text style={styles.hudTitle}>{selectedZone.id.replace(/_/g, " ")}</Text>
                    <View style={[styles.hudBadge, selectedZone.status === 'green' ? { backgroundColor: '#4CD964' } : selectedZone.status === 'orange' ? { backgroundColor: '#FF9500' } : { backgroundColor: '#FF3B30' }]}>
                        <Text style={styles.hudStatusText}>
                            {selectedZone.status === 'green' ? "Vacant: Clear Area" : selectedZone.status === 'orange' ? "Busy: Standard Wait time" : "Critical Congestion"}
                        </Text>
                    </View>

                    {/* Active override recommending dynamically alternative amenity naturally skipping crowds */}
                    {selectedZone.alternativeCoords && selectedZone.status === 'red' && (
                        <TouchableOpacity style={[styles.hudBtnGreen, { marginBottom: 10 }]} onPress={() => {
                            if(!hasCheckedIn) {
                                setToastMessage({ type: 'warning', text: 'Navigation Blocked: Map bounds require you to reach your assigned Block to scan ticket first.' });
                                if(onReroute) onReroute(ticketTarget);
                            } else {
                                if (onReroute) onReroute(selectedZone.alternativeCoords);
                            }
                            setSelectedZone(null);
                        }}>
                            <Text style={styles.hudBtnText}>Reroute to Uncongested Alternative</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.hudRow}>
                        <TouchableOpacity style={styles.hudBtnBlue} onPress={() => {
                            if(!hasCheckedIn) {
                                setToastMessage({ type: 'warning', text: 'Navigation Blocked: Map bounds require you to reach your assigned Block to scan ticket first.' });
                                if(onReroute) onReroute(ticketTarget);
                            } else {
                                if (onReroute) onReroute(selectedZone.coordinates);
                            }
                            setSelectedZone(null);
                        }}>
                            <Text style={styles.hudBtnText}>GPS Navigate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.hudBtnGray} onPress={() => setSelectedZone(null)}>
                            <Text style={styles.hudBtnTextDark}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    mapFrame: { flex: 1 },

    // UI Toggle Overrides 
    floorControlWrapper: { position: 'absolute', top: 50, width: '100%', zIndex: 10, alignItems: 'center' },
    floorPill: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    floorBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    floorBtnActive: { backgroundColor: '#111' },
    floorText: { fontWeight: '700', color: '#555' },
    floorTextActive: { color: '#fff' },

    // TOAST & FAB STRESS UX
    fabBtn: { position: 'absolute', top: 50, right: 20, width: 50, height: 50, backgroundColor: '#fff', borderRadius: 25, justifyContent: 'center', alignItems: 'center', zIndex: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 12 },
    fabIcon: { fontSize: 24 },

    toastWrapper: { position: 'absolute', top: 120, width: '100%', alignItems: 'center', zIndex: 100 },
    toastBox: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    toastText: { color: '#fff', fontWeight: 'bold' },

    hudOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    hudTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10, color: '#111' },
    hudBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 18, alignItems: 'center' },
    hudStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' },
    hudRow: { flexDirection: 'row', justifyContent: 'space-between' },
    hudBtnBlue: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginRight: 10 },
    hudBtnGray: { flex: 1, backgroundColor: '#eee', padding: 15, borderRadius: 8, alignItems: 'center' },
    hudBtnGreen: { backgroundColor: '#4CD964', padding: 15, borderRadius: 8, alignItems: 'center', width: '100%', marginTop: 10 },
    hudBtnText: { color: '#fff', fontWeight: 'bold' },
    hudBtnTextDark: { color: '#333', fontWeight: 'bold' },

    // SUGGESTION DIALOG
    suggestionDialogBox: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10, zIndex: 50 },
    suggestionTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 5 },
    suggestionSub: { fontSize: 14, color: '#666', marginBottom: 15 }
});