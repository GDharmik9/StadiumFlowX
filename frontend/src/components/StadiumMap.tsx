import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { STADIUM_CENTER, virtualToGPS } from '../utils/coordinates';
import { generateVenueGeoJSON } from '../utils/venue';

export const StadiumMap = ({ userLocation, navigationPath = [], stadiumZones = [], onReroute }: any) => {
    const webViewRef = useRef<WebView>(null);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [activeLevel, setActiveLevel] = useState<number>(1); // Defaults showcasing grand Seating Blocks visually
    
    // Core payload resolving entirely strictly internally!
    const venueGeoJSON = generateVenueGeoJSON();

    // Navigation Matrix parsing 0-1000 bounds mapped through GPS
    const pathLineGPS = navigationPath.map((p:any) => {
        const gps = virtualToGPS(p.x, p.y);
        return [gps.lng, gps.lat];
    });

    // We pass the GPS path dynamically reacting flawlessly to rendering loops via message arrays
    useEffect(() => {
        if(webViewRef.current && pathLineGPS.length >= 2) {
             const pathData = { type: 'Feature', geometry: { type: 'LineString', coordinates: pathLineGPS } };
             webViewRef.current.postMessage(JSON.stringify({ type: 'UPDATE_PATH', payload: pathData }));
        }
    }, [navigationPath, activeLevel]);

    // Force strict sync reacting to Native Toggle hooks
    useEffect(() => {
        if(webViewRef.current) {
             webViewRef.current.postMessage(JSON.stringify({ type: 'SET_LEVEL', payload: activeLevel }));
        }
    }, [activeLevel]);

    // MAPLIBRE OS ENGINE HTML (Sandboxed exclusively)
    const htmlContent = `
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
                    // Open-Source Esri Satellite tile mapping dropping massive licensing
                    'satellite': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 }
                },
                layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }]
            },
            center: [${STADIUM_CENTER.lng}, ${STADIUM_CENTER.lat}],
            zoom: 17,
            pitch: 55,       // Isometric Drone projection establishing scale
            bearing: -45,     
            antialias: true  // Critical for fluid 3D line edges visually
        });
        
        window.map = map;

        function bridgeNativeInterface(type, payload) {
             if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
             }
        }

        map.on('load', () => {
             // Establish singular database natively parsing Extrusions vs Nodes strictly inside the engine!
             map.addSource('stadium-data', { type: 'geojson', data: ${JSON.stringify(venueGeoJSON)} });
             
             // Layer 1: Stand Extrusions (3D Building filter dynamically scaling)
             map.addLayer({
                  'id': 'room-extrusion',
                  'type': 'fill-extrusion',
                  'source': 'stadium-data',
                  'filter': ['all', ['==', 'feature_type', 'unit'], ['==', 'level', ${activeLevel}]], // Default to strictly Level 1
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
                  'filter': ['all', ['!=', 'feature_type', 'unit'], ['==', 'level', ${activeLevel}]], 
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

             // Secure Bridging System reacting to Native OS Toggles natively inside DOM scope
             window.addEventListener('message', function(event) {
                 try {
                     const data = JSON.parse(event.data);
                     if(data.type === 'UPDATE_PATH' && window.map) {
                          window.map.getSource('navigation-path').setData(data.payload);
                     }
                     if(data.type === 'SET_LEVEL' && window.map) {
                          window.map.setFilter('room-extrusion', ['all', ['==', 'feature_type', 'unit'], ['==', 'level', data.payload]]);
                          window.map.setFilter('hotspot-points', ['all', ['!=', 'feature_type', 'unit'], ['==', 'level', data.payload]]);
                     }
                 } catch (e) {}
             });

             // Interaction Bridges binding Touch back out to Expo App logic safely!
             map.on('click', 'hotspot-points', (e) => {
                  bridgeNativeInterface('HOTSPOT_SELECTED', e.features[0].properties.id);
             });
        });
    </script>
</body>
</html>
    `;

    // Expo Interception handler 
    const handleWebViewMessage = (event: any) => {
        const data = JSON.parse(event.nativeEvent.data);
        if(data.type === 'HOTSPOT_SELECTED') {
            // Find coordinate dynamically resolving string properties to abstract X/Y for math natively!
            const hitFeature = venueGeoJSON.features.find((f:any) => f.properties.id === data.payload);
            setSelectedZone({
                 id: hitFeature?.properties.name,
                 status: hitFeature?.properties.status,
                 coordinates: stadiumZones.find((z:any)=>z.id === data.payload)?.coordinates || {x:500,y:500} // Legacy fallback bounding math cleanly
            });
        }
    };

    return (
        <View style={styles.container}>
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

            <WebView
                ref={webViewRef}
                style={styles.mapFrame}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                onMessage={handleWebViewMessage}
                // Stop zooming bleeding outside MapLibre bounds
                bounces={false}
                scrollEnabled={false}
            />

            {/* HOTSPOT HUD LAYER decoupling UI rendering completely from HTML payload! */}
            {selectedZone && (
                <View style={styles.hudOverlay}>
                    <Text style={styles.hudTitle}>{selectedZone.id.replace(/_/g, " ")}</Text>
                    <View style={[styles.hudBadge, selectedZone.status === 'green' ? {backgroundColor:'#4CD964'} : selectedZone.status === 'orange' ? {backgroundColor:'#FF9500'} : {backgroundColor:'#FF3B30'}]}>
                        <Text style={styles.hudStatusText}>
                            {selectedZone.status === 'green' ? "Vacant: Clear Area" : selectedZone.status === 'orange' ? "Busy: Standard Wait time" : "Critical Congestion"}
                        </Text>
                    </View>
                    <View style={styles.hudRow}>
                        <TouchableOpacity style={styles.hudBtnBlue} onPress={() => {
                            if(onReroute) onReroute(selectedZone.coordinates);
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
    floorPill: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 4, shadowColor: '#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:5, elevation:5 },
    floorBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    floorBtnActive: { backgroundColor: '#111' },
    floorText: { fontWeight: '700', color: '#555' },
    floorTextActive: { color: '#fff' },

    hudOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset:{width:0,height:5}, shadowOpacity:0.3, shadowRadius:10, elevation:10 },
    hudTitle: { fontSize: 24, fontWeight:'900', marginBottom:10, color: '#111' },
    hudBadge: { paddingVertical:8, paddingHorizontal:12, borderRadius:8, marginBottom:18, alignItems: 'center' },
    hudStatusText: { color: '#fff', fontWeight:'bold', fontSize:14, textTransform: 'uppercase' },
    hudRow: { flexDirection: 'row', justifyContent:'space-between' },
    hudBtnBlue: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems:'center', marginRight: 10 },
    hudBtnGray: { flex: 1, backgroundColor: '#eee', padding: 15, borderRadius: 8, alignItems:'center' },
    hudBtnText: { color: '#fff', fontWeight: 'bold' },
    hudBtnTextDark: { color: '#333', fontWeight: 'bold' }
});