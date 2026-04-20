/**
 * StadiumMap Component
 *
 * The core 3D digital twin rendering engine for StadiumFlow.
 * Embeds a MapLibre GL JS map inside a WebView (native) or iframe (web),
 * displaying satellite imagery, 3D seating blocks, amenity hotspots,
 * navigation paths, and live crowd simulation agents.
 *
 * Architecture:
 * - Native (iOS/Android): React Native WebView with postMessage bridge
 * - Web: HTML iframe with window.postMessage bridge
 * - Both share the same HTML/MapLibre payload via `htmlContent`
 *
 * @module components/StadiumMap
 */
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { STADIUM_CENTER, virtualToGPS } from '../utils/coordinates';
import { generateVenueGeoJSON } from '../utils/venue';
import { getPath } from '../utils/pathfinding';
import type { VirtualCoordinate, ToastMessage, SelectedZone, GhostState, StadiumMapProps } from '../types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Proximity threshold for check-in detection (virtual units) */
const CHECKIN_PROXIMITY = 20;

/** Toast auto-dismiss duration (milliseconds) */
const TOAST_DURATION_MS = 5000;

/** Crowd simulation tick interval (milliseconds) */
const GHOST_TICK_INTERVAL_MS = 150;

/** Status color mapping for congestion levels */
const STATUS_COLORS: Record<string, string> = {
  green: '#4CD964',
  orange: '#FF9500',
  red: '#FF3B30',
};

/** Toast background colors by notification type */
const TOAST_COLORS: Record<string, string> = {
  success: '#4CD964',
  warning: '#FF9500',
  info: '#007AFF',
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const StadiumMap: React.FC<StadiumMapProps> = ({
  userLocation,
  ticketTarget,
  navigationPath = [],
  stadiumZones = [],
  allUsers = [],
  activeRole,
  onReroute,
  onExit,
  onTeleport,
}) => {
  const webViewRef = useRef<WebView>(null);
  const webFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedZone, setSelectedZone] = useState<SelectedZone | null>(null);
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>({
    type: 'info',
    text: 'Welcome! Proceed to Gate 1.',
  });
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  // ─── Script Execution Bridge ───────────────
  /**
   * Safely executes JavaScript in the embedded map context.
   * Routes through WebView.injectJavaScript (native) or postMessage (web).
   */
  const executeMapScript = useCallback(
    (script: string) => {
      if (!isMapReady) return;
      if (Platform.OS === 'web') {
        if (webFrameRef.current?.contentWindow) {
          webFrameRef.current.contentWindow.postMessage(
            JSON.stringify({ type: 'INJECT_JS', payload: script }),
            '*'
          );
        }
      } else {
        webViewRef.current?.injectJavaScript(script);
      }
    },
    [isMapReady]
  );

  // ─── Check-in Detection ────────────────────
  useEffect(() => {
    if (!hasCheckedIn && ticketTarget) {
      const dx = Math.abs(userLocation.x - ticketTarget.x);
      const dy = Math.abs(userLocation.y - ticketTarget.y);
      if (dx < CHECKIN_PROXIMITY && dy < CHECKIN_PROXIMITY) {
        setHasCheckedIn(true);
        setToastMessage({
          type: 'success',
          text: 'Ticket successfully checked in at Block. You are now permitted to access Amenities.',
        });
      }
    }
  }, [userLocation, ticketTarget, hasCheckedIn]);

  // ─── Toast Auto-Dismiss ────────────────────
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ─── Venue GeoJSON (Memoized) ──────────────
  const venueGeoJSON = useMemo(() => generateVenueGeoJSON(), []);

  // ─── Navigation Path GPS Conversion ────────
  const pathLineGPS = useMemo(
    () =>
      navigationPath.map((p: VirtualCoordinate) => {
        const gps = virtualToGPS(p.x, p.y);
        return [gps.lng, gps.lat];
      }),
    [navigationPath]
  );

  // ─── Clustered Offset for Avatar Deconfliction ──
  const getClusteredOffset = useCallback((idStr: string): VirtualCoordinate => {
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return { x: (hash % 30) - 15, y: ((hash >> 3) % 30) - 15 };
  }, []);

  // ─── Ghost Agent Simulation ────────────────
  const ghostStateRef = useRef<Record<string, GhostState>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const activeGhosts = allUsers.filter(
        (u) => u.tester_id !== activeRole && u.current_coords
      );
      if (activeGhosts.length === 0) return;

      const features = activeGhosts.map((ghostBase) => {
        let state = ghostStateRef.current[ghostBase.tester_id];
        if (!state) {
          const offset = getClusteredOffset(ghostBase.tester_id);
          state = {
            coords: {
              x: ghostBase.current_coords.x + offset.x,
              y: ghostBase.current_coords.y + offset.y,
            },
            path: [],
            step: 0,
            waitTicks: Math.floor(Math.random() * 20),
          };
        }

        if (state.waitTicks > 0) {
          state.waitTicks--;
        } else if (state.path && state.step < state.path.length - 1) {
          state.step++;
          state.coords = state.path[state.step];
        } else {
          const newTarget = { x: 100 + Math.random() * 800, y: 100 + Math.random() * 800 };
          state.path = getPath(state.coords, newTarget);
          state.step = 0;
          state.waitTicks = 20 + Math.floor(Math.random() * 40);
        }
        ghostStateRef.current[ghostBase.tester_id] = state;

        const gps = virtualToGPS(state.coords.x, state.coords.y);
        return {
          type: 'Feature' as const,
          properties: { id: ghostBase.tester_id },
          geometry: { type: 'Point' as const, coordinates: [gps.lng, gps.lat] },
        };
      });

      const ghostsGeoJSON = { type: 'FeatureCollection', features };
      executeMapScript(`
        if(window.map && window.map.getSource('ghost-agents')) {
          window.map.getSource('ghost-agents').setData(${JSON.stringify(ghostsGeoJSON)});
        }
        true;
      `);
    }, GHOST_TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [allUsers, activeRole, executeMapScript, getClusteredOffset]);

  // ─── Active User GPS Position ──────────────
  const activeOffset = useMemo(() => getClusteredOffset(activeRole || 'User_0'), [activeRole, getClusteredOffset]);

  const activeUserGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'active-user' },
          geometry: {
            type: 'Point',
            coordinates: [
              virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lng,
              virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y).lat,
            ],
          },
        },
      ],
    }),
    [userLocation, activeOffset]
  );

  // ─── Navigation Path Sync ──────────────────
  useEffect(() => {
    const pathData =
      pathLineGPS.length >= 2
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: pathLineGPS } }
        : { type: 'FeatureCollection', features: [] };

    executeMapScript(`
      if(window.map && window.map.getSource('navigation-path')) {
        window.map.getSource('navigation-path').setData(${JSON.stringify(pathData)});
      }
      true;
    `);
  }, [navigationPath, activeLevel, isMapReady, executeMapScript, pathLineGPS]);

  // ─── Level Toggle Sync ─────────────────────
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
  }, [activeLevel, isMapReady, executeMapScript]);

  // ─── Active User Tracking Camera ───────────
  useEffect(() => {
    const userGPS = virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y);
    executeMapScript(`
      if(window.map && window.map.getSource('active-user')) {
        window.map.getSource('active-user').setData(${JSON.stringify(activeUserGeoJSON)});
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
  }, [userLocation, isMapReady, executeMapScript, activeOffset, activeUserGeoJSON]);

  // ─── Proximity-based Notifications ─────────
  useEffect(() => {
    const distToGate1 = Math.sqrt(
      Math.pow(220 - userLocation.x, 2) + Math.pow(850 - userLocation.y, 2)
    );
    if (distToGate1 < 25) {
      setToastMessage({ type: 'success', text: 'Ticket Scanned: Welcome to the Stadium Simulation.' });
    } else if (navigationPath.length > 0) {
      const dest = navigationPath[navigationPath.length - 1];
      const targetAmenity = stadiumZones.find(
        (z) => z.coordinates && z.coordinates.x === dest.x && z.coordinates.y === dest.y
      );
      if (targetAmenity) {
        if (targetAmenity.status === 'red') {
          setToastMessage({
            type: 'warning',
            text: `${targetAmenity.id.replace(/_/g, ' ')} is heavily congested.`,
          });
        } else {
          setToastMessage({
            type: 'info',
            text: `Routing safely to ${targetAmenity.id.replace(/_/g, ' ')}...`,
          });
        }
      }
    }
  }, [userLocation, navigationPath, stadiumZones]);

  // ─── MapLibre HTML Payload ─────────────────
  const htmlContent = useMemo(() => {
    const centerGPS = virtualToGPS(
      userLocation.x + activeOffset.x,
      userLocation.y + activeOffset.y
    );
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="description" content="StadiumFlow 3D Digital Twin Map - Real-time crowd visualization" />
    <title>StadiumFlow Digital Twin</title>
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      body { margin: 0; padding: 0; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      #map:focus { outline: 2px solid #007AFF; }
    </style>
</head>
<body>
    <div id="map" role="application" aria-label="3D Stadium Map with live crowd data"></div>
    <script>
        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'satellite': { type: 'raster', tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], tileSize: 256 }
                },
                layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }]
            },
            center: [${centerGPS.lng}, ${centerGPS.lat}],
            zoom: 18,
            pitch: 55,
            bearing: -45,
            antialias: true
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
            map.addSource('stadium-data', { type: 'geojson', data: ${JSON.stringify(venueGeoJSON)} });

            // Layer 1: 3D Seating Block Extrusions
            map.addLayer({
                'id': 'room-extrusion',
                'type': 'fill-extrusion',
                'source': 'stadium-data',
                'filter': ['all', ['==', 'feature_type', 'unit'], ['==', 'level', 1]],
                'paint': {
                    'fill-extrusion-color': ['get', 'color'],
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'base_height'],
                    'fill-extrusion-opacity': 0.85
                }
            });

            // Layer 2: Navigation Path Line
            map.addSource('navigation-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({
                'id': 'navigation-line',
                'type': 'line',
                'source': 'navigation-path',
                'paint': {
                    'line-color': '#007AFF',
                    'line-width': 8,
                    'line-opacity': 0.9,
                    'line-dasharray': [2, 1]
                }
            });

            // Layer 3: Amenity Hotspot Dots
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

            // Layer 3.5: Amenity Labels
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

            // Layer 4: Ghost Agents (Crowd Simulation)
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

            // Layer 5: Active User Blue Dot
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

            // Hotspot click interaction
            map.on('click', 'hotspot-points', (e) => {
                bridgeNativeInterface('HOTSPOT_SELECTED', e.features[0].properties.id);
            });

            map.on('idle', () => {
                bridgeNativeInterface('MAP_READY', true);
            });
        });
    </script>
</body>
</html>`;
  }, [venueGeoJSON]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Message Handler ───────────────────────
  const handleWebViewMessage = useCallback(
    (event: any) => {
      const rawData = event.nativeEvent ? event.nativeEvent.data : event.data;
      if (!rawData || typeof rawData !== 'string') return;

      let data;
      try {
        data = JSON.parse(rawData);
      } catch {
        return;
      }

      if (data.type === 'MAP_READY') {
        setIsMapReady(true);
        return;
      }

      if (data.type === 'HOTSPOT_SELECTED') {
        const hitFeature = venueGeoJSON.features.find((f) => f.properties.id === data.payload);
        if (!hitFeature) return;

        const isCongested = hitFeature.properties.status === 'red';

        let altCoords: VirtualCoordinate | null = null;
        if (isCongested && hitFeature.properties.category) {
          const altFeature = venueGeoJSON.features.find(
            (f) =>
              f.properties.category === hitFeature.properties.category &&
              f.properties.id !== data.payload &&
              f.properties.status !== 'red'
          );
          if (altFeature?.properties.vx != null && altFeature?.properties.vy != null) {
            altCoords = { x: altFeature.properties.vx, y: altFeature.properties.vy };
          }
        }

        if (isCongested) {
          Vibration.vibrate([100, 500, 100, 500]);
        }

        setSelectedZone({
          id: hitFeature.properties.name,
          status: hitFeature.properties.status || 'green',
          coordinates: {
            x: hitFeature.properties.vx || 500,
            y: hitFeature.properties.vy || 500,
          },
          alternativeCoords: altCoords,
        });
      }
    },
    [venueGeoJSON]
  );

  // ─── Web Message Listener ──────────────────
  useEffect(() => {
    if (Platform.OS === 'web') {
      const listener = (e: MessageEvent) => handleWebViewMessage(e);
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }
  }, [handleWebViewMessage]);

  // ─── Navigation Handlers ───────────────────
  const handleNavigateToZone = useCallback(
    (target: VirtualCoordinate) => {
      if (!hasCheckedIn) {
        setToastMessage({
          type: 'warning',
          text: 'Navigation Blocked: Map bounds require you to reach your assigned Block to scan ticket first.',
        });
        if (onReroute && ticketTarget) onReroute(ticketTarget);
      } else {
        if (onReroute) onReroute(target);
      }
      setSelectedZone(null);
    },
    [hasCheckedIn, onReroute, ticketTarget]
  );

  // ─── Render ────────────────────────────────
  return (
    <View style={styles.container} accessible={true} accessibilityLabel="Stadium 3D Map View">
      {/* Exit FAB */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={onExit}
        accessibilityRole="button"
        accessibilityLabel="Return to dashboard"
        accessibilityHint="Exit the 3D map view"
      >
        <Text style={styles.fabIcon} accessibilityElementsHidden={true}>
          🏠
        </Text>
      </TouchableOpacity>

      {/* Toast Notifications */}
      {toastMessage && (
        <SafeAreaView style={styles.toastWrapper}>
          <View
            style={[styles.toastBox, { backgroundColor: TOAST_COLORS[toastMessage.type] || '#007AFF' }]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={toastMessage.text}
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.toastText}>{toastMessage.text}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Level Toggle */}
      <SafeAreaView style={styles.floorControlWrapper}>
        <View
          style={styles.floorPill}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Floor level selector"
        >
          <TouchableOpacity
            style={[styles.floorBtn, activeLevel === 1 && styles.floorBtnActive]}
            onPress={() => setActiveLevel(1)}
            accessibilityRole="tab"
            accessibilityLabel="Seating Level 1"
            accessibilityState={{ selected: activeLevel === 1 }}
          >
            <Text style={[styles.floorText, activeLevel === 1 && styles.floorTextActive]}>
              Seating (L1)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floorBtn, activeLevel === 0 && styles.floorBtnActive]}
            onPress={() => setActiveLevel(0)}
            accessibilityRole="tab"
            accessibilityLabel="Concourse Level 0"
            accessibilityState={{ selected: activeLevel === 0 }}
          >
            <Text style={[styles.floorText, activeLevel === 0 && styles.floorTextActive]}>
              Concourse (L0)
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map Rendering */}
      {Platform.OS === 'web' ? (
        <View style={[styles.mapFrame, { overflow: 'hidden' }]}>
          {React.createElement('iframe', {
            ref: webFrameRef,
            style: { width: '100%', height: '100%', border: 'none' },
            srcDoc: htmlContent,
            title: 'StadiumFlow 3D Digital Twin Map',
            'aria-label': '3D stadium map with live crowd visualization',
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
          accessibilityLabel="3D stadium map"
        />
      )}

      {/* Congestion Warning Dialog */}
      {selectedZone && (selectedZone.status === 'red' || selectedZone.status === 'orange') && (
        <View
          style={[styles.suggestionDialogBox, { backgroundColor: '#3b0000', borderColor: '#ff3b30' }]}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Congestion warning at ${selectedZone.id}. Estimated wait time: 18 minutes.`}
        >
          <Text style={[styles.suggestionTitle, { color: '#ff3b30', fontSize: 24, fontWeight: '900' }]}>
            🔥 CONGESTION WARNING
          </Text>
          <Text style={[styles.suggestionSub, { color: '#ffaaaa', fontSize: 16, marginTop: 10, lineHeight: 22 }]}>
            {selectedZone.id} is currently experiencing extreme crowd density! Estimated Wait Time: 18
            Minutes.
          </Text>
          {selectedZone.alternativeCoords ? (
            <TouchableOpacity
              style={[styles.hudBtnGreen, { backgroundColor: '#ff3b30', marginTop: 15, padding: 15 }]}
              onPress={() => {
                Vibration.vibrate();
                if (onReroute && selectedZone.alternativeCoords) {
                  onReroute(selectedZone.alternativeCoords);
                }
                setSelectedZone(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Reroute to uncongested area"
              accessibilityHint="Navigates you to a less crowded alternative"
            >
              <Text style={[styles.hudBtnText, { fontSize: 16, fontWeight: '900' }]}>
                [ Reroute to Uncongested Area ]
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.hudBtnGreen, { backgroundColor: '#888', marginTop: 15 }]}
              onPress={() => setSelectedZone(null)}
              accessibilityRole="button"
              accessibilityLabel="Accept congestion and proceed anyway"
            >
              <Text style={styles.hudBtnText}>[ Accept & Proceed Anyway ]</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Navigation Active Panel */}
      {navigationPath.length > 0 && !selectedZone && (
        <View
          style={styles.suggestionDialogBox}
          accessible={true}
          accessibilityLabel="Navigation is active. Follow the blue line."
        >
          <Text style={styles.suggestionTitle}>Navigation Active</Text>
          <Text style={styles.suggestionSub}>Follow the blue routing line to your destination.</Text>
          <TouchableOpacity
            style={styles.hudBtnGreen}
            onPress={() => {
              if (onTeleport) onTeleport(navigationPath[navigationPath.length - 1]);
            }}
            accessibilityRole="button"
            accessibilityLabel="Simulate navigation to destination"
          >
            <Text style={styles.hudBtnText}>[ Navigate ]</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Zone Info HUD */}
      {selectedZone && (
        <View
          style={styles.hudOverlay}
          accessible={true}
          accessibilityLabel={`${selectedZone.id.replace(/_/g, ' ')}: ${selectedZone.status === 'green' ? 'Clear' : selectedZone.status === 'orange' ? 'Busy' : 'Congested'}`}
        >
          <Text style={styles.hudTitle} accessibilityRole="header">
            {selectedZone.id.replace(/_/g, ' ')}
          </Text>
          <View
            style={[
              styles.hudBadge,
              { backgroundColor: STATUS_COLORS[selectedZone.status] || '#ccc' },
            ]}
          >
            <Text style={styles.hudStatusText}>
              {selectedZone.status === 'green'
                ? 'Vacant: Clear Area'
                : selectedZone.status === 'orange'
                  ? 'Busy: Standard Wait time'
                  : 'Critical Congestion'}
            </Text>
          </View>

          {/* Alternative Reroute Button */}
          {selectedZone.alternativeCoords && selectedZone.status === 'red' && (
            <TouchableOpacity
              style={[styles.hudBtnGreen, { marginBottom: 10 }]}
              onPress={() => handleNavigateToZone(selectedZone.alternativeCoords!)}
              accessibilityRole="button"
              accessibilityLabel="Reroute to uncongested alternative"
            >
              <Text style={styles.hudBtnText}>Reroute to Uncongested Alternative</Text>
            </TouchableOpacity>
          )}

          <View style={styles.hudRow}>
            <TouchableOpacity
              style={styles.hudBtnBlue}
              onPress={() => handleNavigateToZone(selectedZone.coordinates)}
              accessibilityRole="button"
              accessibilityLabel="Start GPS navigation to this zone"
            >
              <Text style={styles.hudBtnText}>GPS Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hudBtnGray}
              onPress={() => setSelectedZone(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss zone information"
            >
              <Text style={styles.hudBtnTextDark}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mapFrame: { flex: 1 },

  // Floor Toggle
  floorControlWrapper: {
    position: 'absolute',
    top: 50,
    width: '100%',
    zIndex: 10,
    alignItems: 'center',
  },
  floorPill: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  floorBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, minHeight: 44 },
  floorBtnActive: { backgroundColor: '#111' },
  floorText: { fontWeight: '700', color: '#555' },
  floorTextActive: { color: '#fff' },

  // FAB & Toast
  fabBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 12,
  },
  fabIcon: { fontSize: 24 },

  toastWrapper: { position: 'absolute', top: 120, width: '100%', alignItems: 'center', zIndex: 100 },
  toastBox: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  toastText: { color: '#fff', fontWeight: 'bold' },

  // HUD Overlay
  hudOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  hudTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10, color: '#111' },
  hudBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 18,
    alignItems: 'center',
  },
  hudStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hudBtnBlue: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    minHeight: 48,
  },
  hudBtnGray: {
    flex: 1,
    backgroundColor: '#eee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
  },
  hudBtnGreen: {
    backgroundColor: '#4CD964',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    minHeight: 48,
  },
  hudBtnText: { color: '#fff', fontWeight: 'bold' },
  hudBtnTextDark: { color: '#333', fontWeight: 'bold' },

  // Suggestion Dialog
  suggestionDialogBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 50,
  },
  suggestionTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 5 },
  suggestionSub: { fontSize: 14, color: '#666', marginBottom: 15 },
});