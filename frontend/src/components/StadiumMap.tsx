import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { virtualToGPS, STADIUM_CENTER } from '../utils/coordinates';
import { getPath } from '../utils/pathfinding';
import type { VirtualCoordinate, ToastMessage, SelectedZone, GhostState, StadiumMapProps } from '../types';

const STATUS_COLORS: Record<string, string> = { green: '#4CD964', orange: '#FF9500', red: '#FF3B30' };
const TOAST_COLORS: Record<string, string> = { success: '#4CD964', warning: '#FF9500', info: '#007AFF' };
const TOAST_MS = 5000;
const GHOST_TICK_MS = 150;

// Venue data as a compact inline string — generated inside the WebView browser context
// to avoid bloating the Metro JS bundle and causing OOM during bundling
const VENUE_SCRIPT = `
(function(){
  var C=0.0000033, LAT=23.0919, LNG=72.5975;
  function gps(x,y){return [LNG+(x-500)*C, LAT-(y-500)*C];}
  function wedge(x,y,d){var h=d/2;return [[gps(x-h,y-h),gps(x+h,y-h),gps(x+h,y+h),gps(x-h,y+h),gps(x-h,y-h)]];}
  var blocks=[
    {l:'A',x:350,y:180},{l:'B',x:420,y:150},{l:'C',x:580,y:150},{l:'D',x:650,y:180},
    {l:'E',x:780,y:250},{l:'F',x:850,y:350},{l:'G',x:880,y:500},{l:'H',x:850,y:650},
    {l:'J',x:750,y:750},{l:'K',x:650,y:820},{l:'L',x:500,y:850},{l:'M',x:350,y:820},
    {l:'N',x:250,y:750},{l:'P',x:180,y:650},{l:'Q',x:150,y:500},{l:'R',x:180,y:350}
  ];
  var amenities=[
    {id:'food_court_1',n:'Food Court East',x:820,y:420,cat:'food_court',s:'orange'},
    {id:'food_court_2',n:'Food Court West',x:180,y:580,cat:'food_court',s:'green'},
    {id:'wash_north',n:'Washroom North',x:500,y:120,cat:'washroom',s:'green'},
    {id:'wash_east',n:'Washroom East',x:880,y:600,cat:'washroom',s:'red'},
    {id:'wash_south',n:'Washroom South',x:500,y:880,cat:'washroom',s:'green'},
    {id:'wash_west',n:'Washroom West',x:120,y:400,cat:'washroom',s:'green'},
    {id:'medical',n:'Medical Center',x:450,y:850,cat:'medical',s:'green'},
    {id:'water',n:'Water Station',x:700,y:250,cat:'water',s:'green'}
  ];
  var gates=[
    {id:'gate_1',n:'Gate 1',x:220,y:850,cat:'entrance',s:'green'},
    {id:'gate_2',n:'Gate 2',x:120,y:500,cat:'entrance',s:'orange'},
    {id:'gate_3',n:'Gate 3',x:780,y:150,cat:'entrance',s:'green'},
    {id:'gate_4',n:'Gate 4',x:880,y:500,cat:'entrance',s:'green'}
  ];
  var features=[];
  blocks.forEach(function(b){
    features.push({type:'Feature',properties:{id:'block_'+b.l.toLowerCase(),feature_type:'unit',category:'seating_block',name:'Block '+b.l,level:1,color:'#1a5b82',height:35+(b.l.charCodeAt(0)%15),base_height:5},geometry:{type:'Polygon',coordinates:wedge(b.x,b.y,45)}});
  });
  amenities.forEach(function(a){
    var p=gps(a.x,a.y);
    features.push({type:'Feature',properties:{id:a.id,feature_type:'amenity',category:a.cat,name:a.n,level:0,status:a.s,vx:a.x,vy:a.y},geometry:{type:'Point',coordinates:p}});
  });
  gates.forEach(function(g){
    var p=gps(g.x,g.y);
    features.push({type:'Feature',properties:{id:g.id,feature_type:'opening',category:g.cat,name:g.n,level:0,status:g.s,vx:g.x,vy:g.y},geometry:{type:'Point',coordinates:p}});
  });
  window.VENUE_DATA={type:'FeatureCollection',features:features};
  window.VENUE_INDEX={};
  features.forEach(function(f){window.VENUE_INDEX[f.properties.id]=f.properties;});
})();
`;

export const StadiumMap: React.FC<StadiumMapProps> = ({
  userLocation, ticketTarget, navigationPath = [], stadiumZones = [],
  allUsers = [], activeRole, onReroute, onExit, onTeleport,
}) => {
  const webViewRef = useRef<WebView>(null);
  const webFrameRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedZone, setSelectedZone] = useState<SelectedZone | null>(null);
  const [activeLevel, setActiveLevel] = useState(0);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>({
    type: 'info', text: 'Welcome! Tap any coloured dot on the map.',
  });
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const getClusteredOffset = useCallback((id: string): VirtualCoordinate => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    return { x: (h % 30) - 15, y: ((h >> 3) % 30) - 15 };
  }, []);

  const activeOffset = useMemo(
    () => getClusteredOffset(activeRole || 'User_0'),
    [activeRole, getClusteredOffset]
  );

  const pathLineGPS = useMemo(
    () => navigationPath.map((p: VirtualCoordinate) => {
      const g = virtualToGPS(p.x, p.y);
      return [g.lng, g.lat];
    }),
    [navigationPath]
  );

  // ── Script bridge ──────────────────────────────────────────────────────
  const executeMapScript = useCallback((script: string) => {
    if (!isMapReady) return;
    if (Platform.OS === 'web') {
      webFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'INJECT_JS', payload: script }), '*'
      );
    } else {
      webViewRef.current?.injectJavaScript(script);
    }
  }, [isMapReady]);

  // ── Check-in detection ────────────────────────────────────────────────
  useEffect(() => {
    if (!hasCheckedIn && ticketTarget) {
      const dx = Math.abs(userLocation.x - ticketTarget.x);
      const dy = Math.abs(userLocation.y - ticketTarget.y);
      if (dx < 20 && dy < 20) {
        setHasCheckedIn(true);
        setToastMessage({ type: 'success', text: 'Ticket checked in! Navigate freely.' });
      }
    }
  }, [userLocation, ticketTarget, hasCheckedIn]);

  // ── Toast auto-dismiss ────────────────────────────────────────────────
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), TOAST_MS);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // ── Sync navigation path ──────────────────────────────────────────────
  useEffect(() => {
    const data = pathLineGPS.length >= 2
      ? JSON.stringify({ type: 'Feature', geometry: { type: 'LineString', coordinates: pathLineGPS } })
      : JSON.stringify({ type: 'FeatureCollection', features: [] });
    executeMapScript(`if(window.map&&window.map.getSource('nav-path')){window.map.getSource('nav-path').setData(${data});}true;`);
  }, [pathLineGPS, isMapReady, executeMapScript]);

  // ── Level toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    executeMapScript(`
      if(window.map){
        window.map.setPaintProperty('room-extrusion','fill-extrusion-opacity',${activeLevel===1?0.85:0.0});
        window.map.setPaintProperty('hotspot-points','circle-opacity',${activeLevel===0?1.0:0.0});
        if(window.map.getLayer('hotspot-labels'))window.map.setPaintProperty('hotspot-labels','text-opacity',${activeLevel===0?1.0:0.0});
        if(window.map.getLayer('ghost-layer'))window.map.setPaintProperty('ghost-layer','circle-opacity',${activeLevel===0?0.7:0.0});
      }true;
    `);
  }, [activeLevel, isMapReady, executeMapScript]);

  // ── Sync user position ────────────────────────────────────────────────
  useEffect(() => {
    const gps = virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y);
    const data = JSON.stringify({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] } }],
    });
    executeMapScript(`
      if(window.map&&window.map.getSource('active-user')){
        window.map.getSource('active-user').setData(${data});
        window.map.flyTo({center:[${gps.lng},${gps.lat}],zoom:18,pitch:55,duration:1500});
      }true;
    `);
  }, [userLocation, activeOffset, isMapReady, executeMapScript]);

  // ── Ghost simulation ──────────────────────────────────────────────────
  const ghostStateRef = useRef<Record<string, GhostState>>({});
  useEffect(() => {
    const iv = setInterval(() => {
      const ghosts = allUsers.filter(u => u.tester_id !== activeRole && u.current_coords);
      if (!ghosts.length) return;
      const features = ghosts.map(g => {
        let s = ghostStateRef.current[g.tester_id];
        if (!s) {
          const off = getClusteredOffset(g.tester_id);
          s = { coords: { x: g.current_coords.x + off.x, y: g.current_coords.y + off.y }, path: [], step: 0, waitTicks: Math.floor(Math.random() * 20) };
        }
        if (s.waitTicks > 0) { s.waitTicks--; }
        else if (s.path && s.step < s.path.length - 1) { s.step++; s.coords = s.path[s.step]; }
        else {
          const t = { x: 100 + Math.random() * 800, y: 100 + Math.random() * 800 };
          s.path = getPath(s.coords, t); s.step = 0; s.waitTicks = 20 + Math.floor(Math.random() * 40);
        }
        ghostStateRef.current[g.tester_id] = s;
        const gps = virtualToGPS(s.coords.x, s.coords.y);
        return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [gps.lng, gps.lat] } };
      });
      const data = JSON.stringify({ type: 'FeatureCollection', features });
      executeMapScript(`if(window.map&&window.map.getSource('ghost-agents')){window.map.getSource('ghost-agents').setData(${data});}true;`);
    }, GHOST_TICK_MS);
    return () => clearInterval(iv);
  }, [allUsers, activeRole, executeMapScript, getClusteredOffset]);

  // ── HTML (venue generated in-browser, path pre-embedded as small coords) ─
  const htmlContent = useMemo(() => {
    const userGPS = virtualToGPS(userLocation.x + activeOffset.x, userLocation.y + activeOffset.y);
    // Only embed the path coords (small array), not the full venue GeoJSON
    const initialPathData = pathLineGPS.length >= 2
      ? `{type:'Feature',geometry:{type:'LineString',coordinates:${JSON.stringify(pathLineGPS)}}}`
      : `{type:'FeatureCollection',features:[]}`;
    const userCoords = `[${userGPS.lng},${userGPS.lat}]`;

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>StadiumFlow</title>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet"/>
<style>body{margin:0;padding:0;}#map{position:absolute;top:0;bottom:0;width:100%;}</style>
</head><body><div id="map"></div><script>
${VENUE_SCRIPT}
var readySent=false;
var map=new maplibregl.Map({
  container:'map',
  style:{version:8,sources:{sat:{type:'raster',tiles:['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],tileSize:256}},layers:[{id:'sat',type:'raster',source:'sat'}]},
  center:${userCoords},zoom:18,pitch:55,bearing:-45,antialias:true
});
window.map=map;
function bridge(t,p){var m=JSON.stringify({type:t,payload:p});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else window.parent.postMessage(m,'*');}
window.addEventListener('message',function(e){try{var m=JSON.parse(e.data);if(m.type==='INJECT_JS')eval(m.payload);}catch(x){}});
map.on('load',function(){
  map.addSource('venue',{type:'geojson',data:window.VENUE_DATA});
  map.addSource('nav-path',{type:'geojson',data:${initialPathData}});
  map.addSource('active-user',{type:'geojson',data:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:${userCoords}}}]}});
  map.addSource('ghost-agents',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'room-extrusion',type:'fill-extrusion',source:'venue',filter:['==',['get','feature_type'],'unit'],paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-height':['get','height'],'fill-extrusion-base':['get','base_height'],'fill-extrusion-opacity':0.0}});
  map.addLayer({id:'nav-line',type:'line',source:'nav-path',paint:{'line-color':'#00E5FF','line-width':10,'line-opacity':1.0}});
  map.addLayer({id:'hotspot-points',type:'circle',source:'venue',filter:['!=',['get','feature_type'],'unit'],paint:{'circle-radius':14,'circle-opacity':1.0,'circle-color':['match',['get','status'],'green','#4CD964','orange','#FF9500','red','#FF3B30','#aaa'],'circle-stroke-width':3,'circle-stroke-color':'#fff'}});
  map.addLayer({id:'hotspot-labels',type:'symbol',source:'venue',filter:['!=',['get','feature_type'],'unit'],layout:{'text-field':['get','name'],'text-size':11,'text-offset':[0,1.5],'text-anchor':'top'},paint:{'text-color':'#fff','text-halo-color':'#000','text-halo-width':2}});
  map.addLayer({id:'ghost-layer',type:'circle',source:'ghost-agents',paint:{'circle-radius':10,'circle-color':'#00bcd4','circle-opacity':0.7,'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
  map.addLayer({id:'active-user-point',type:'circle',source:'active-user',paint:{'circle-radius':14,'circle-color':'#007AFF','circle-stroke-width':3,'circle-stroke-color':'#fff','circle-opacity':1.0}});
  map.on('click','hotspot-points',function(e){if(e.features&&e.features.length>0)bridge('HOTSPOT_SELECTED',e.features[0].properties.id);});
  map.on('idle',function(){if(!readySent){readySent=true;bridge('MAP_READY',true);}});
});
</script></body></html>`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Message handler ───────────────────────────────────────────────────
  const handleWebViewMessage = useCallback((event: any) => {
    const raw = event.nativeEvent ? event.nativeEvent.data : event.data;
    if (!raw || typeof raw !== 'string') return;
    let data: any;
    try { data = JSON.parse(raw); } catch { return; }
    if (data.type === 'MAP_READY') { setIsMapReady(true); return; }
    if (data.type === 'HOTSPOT_SELECTED') {
      // Find feature in venue data by re-scanning amenities/gates
      const amenities = [
        { id: 'food_court_1', name: 'Food Court East', category: 'food_court', status: 'orange' as const, vx: 820, vy: 420 },
        { id: 'food_court_2', name: 'Food Court West', category: 'food_court', status: 'green' as const, vx: 180, vy: 580 },
        { id: 'wash_north', name: 'Washroom North', category: 'washroom', status: 'green' as const, vx: 500, vy: 120 },
        { id: 'wash_east', name: 'Washroom East', category: 'washroom', status: 'red' as const, vx: 880, vy: 600 },
        { id: 'wash_south', name: 'Washroom South', category: 'washroom', status: 'green' as const, vx: 500, vy: 880 },
        { id: 'wash_west', name: 'Washroom West', category: 'washroom', status: 'green' as const, vx: 120, vy: 400 },
        { id: 'medical', name: 'Medical Center', category: 'medical', status: 'green' as const, vx: 450, vy: 850 },
        { id: 'water', name: 'Water Station', category: 'water', status: 'green' as const, vx: 700, vy: 250 },
        { id: 'gate_1', name: 'Gate 1', category: 'entrance', status: 'green' as const, vx: 220, vy: 850 },
        { id: 'gate_2', name: 'Gate 2', category: 'entrance', status: 'orange' as const, vx: 120, vy: 500 },
        { id: 'gate_3', name: 'Gate 3', category: 'entrance', status: 'green' as const, vx: 780, vy: 150 },
        { id: 'gate_4', name: 'Gate 4', category: 'entrance', status: 'green' as const, vx: 880, vy: 500 },
      ];
      const hit = amenities.find(a => a.id === data.payload);
      if (!hit) return;
      const isCongested = hit.status === 'red';
      const alt = isCongested ? amenities.find(a => a.category === hit.category && a.id !== hit.id && a.status !== 'red') : null;
      if (isCongested) Vibration.vibrate([100, 500, 100, 500]);
      setSelectedZone({
        id: hit.name,
        status: hit.status,
        coordinates: { x: hit.vx, y: hit.vy },
        alternativeCoords: alt ? { x: alt.vx, y: alt.vy } : null,
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleWebViewMessage);
      return () => window.removeEventListener('message', handleWebViewMessage);
    }
  }, [handleWebViewMessage]);

  const handleNavigateToZone = useCallback((target: VirtualCoordinate) => {
    if (!hasCheckedIn) {
      setToastMessage({ type: 'warning', text: 'Reach your seat gate first to unlock free navigation.' });
      if (onReroute && ticketTarget) onReroute(ticketTarget);
    } else {
      if (onReroute) onReroute(target);
    }
    setSelectedZone(null);
  }, [hasCheckedIn, onReroute, ticketTarget]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fabBtn} onPress={onExit} accessibilityRole="button" accessibilityLabel="Dashboard">
        <Text style={styles.fabIcon}>🏠</Text>
      </TouchableOpacity>

      {toastMessage && (
        <SafeAreaView style={styles.toastWrapper}>
          <View style={[styles.toastBox, { backgroundColor: TOAST_COLORS[toastMessage.type] || '#007AFF' }]} accessibilityRole="alert">
            <Text style={styles.toastText}>{toastMessage.text}</Text>
          </View>
        </SafeAreaView>
      )}

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
          {React.createElement('iframe', { ref: webFrameRef, style: { width: '100%', height: '100%', border: 'none' }, srcDoc: htmlContent, title: 'StadiumFlow Map' })}
        </View>
      ) : (
        <WebView ref={webViewRef} style={styles.mapFrame} originWhitelist={['*']} source={{ html: htmlContent }} onMessage={handleWebViewMessage} bounces={false} scrollEnabled={false} javaScriptEnabled allowsInlineMediaPlayback />
      )}

      {selectedZone && (selectedZone.status === 'red' || selectedZone.status === 'orange') && (
        <View style={[styles.dialog, { backgroundColor: '#3b0000', borderWidth: 2, borderColor: '#ff3b30' }]} accessibilityRole="alert">
          <Text style={[styles.dialogTitle, { color: '#ff3b30' }]}>🔥 CONGESTION WARNING</Text>
          <Text style={[styles.dialogSub, { color: '#ffaaaa' }]}>{selectedZone.id} is heavily congested! Est. wait: 18 min</Text>
          {selectedZone.alternativeCoords ? (
            <TouchableOpacity style={[styles.btnGreen, { backgroundColor: '#ff3b30', marginTop: 15 }]}
              onPress={() => { Vibration.vibrate(); if (onReroute && selectedZone.alternativeCoords) onReroute(selectedZone.alternativeCoords); setSelectedZone(null); }}>
              <Text style={styles.btnText}>[ Reroute to Uncongested Area ]</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btnGreen, { backgroundColor: '#888', marginTop: 15 }]} onPress={() => setSelectedZone(null)}>
              <Text style={styles.btnText}>[ Accept & Proceed ]</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {navigationPath.length > 0 && !selectedZone && (
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Navigation Active</Text>
          <Text style={styles.dialogSub}>Follow the cyan line on the map to your destination.</Text>
          <TouchableOpacity style={styles.btnGreen} onPress={() => { if (onTeleport) onTeleport(navigationPath[navigationPath.length - 1]); }}>
            <Text style={styles.btnText}>[ Arrive at Destination ]</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedZone && selectedZone.status !== 'red' && selectedZone.status !== 'orange' && (
        <View style={styles.hud}>
          <Text style={styles.hudTitle}>{selectedZone.id}</Text>
          <View style={[styles.hudBadge, { backgroundColor: STATUS_COLORS[selectedZone.status] || '#ccc' }]}>
            <Text style={styles.hudBadgeText}>{selectedZone.status === 'green' ? 'Clear — Walk right in' : 'Busy'}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={[styles.hudBtn, { backgroundColor: '#007AFF', marginRight: 10 }]} onPress={() => handleNavigateToZone(selectedZone.coordinates)}>
              <Text style={styles.btnText}>GPS Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.hudBtn, { backgroundColor: '#eee' }]} onPress={() => setSelectedZone(null)}>
              <Text style={[styles.btnText, { color: '#333' }]}>Dismiss</Text>
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
  fabBtn: { position: 'absolute', top: 50, right: 20, width: 50, height: 50, backgroundColor: '#fff', borderRadius: 25, justifyContent: 'center', alignItems: 'center', zIndex: 200, elevation: 12 },
  fabIcon: { fontSize: 24 },
  floorControlWrapper: { position: 'absolute', top: 50, width: '100%', zIndex: 10, alignItems: 'center' },
  floorPill: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  floorBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, minHeight: 44 },
  floorBtnActive: { backgroundColor: '#111' },
  floorText: { fontWeight: '700', color: '#555' },
  floorTextActive: { color: '#fff' },
  toastWrapper: { position: 'absolute', top: 120, width: '100%', alignItems: 'center', zIndex: 100 },
  toastBox: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, elevation: 5 },
  toastText: { color: '#fff', fontWeight: 'bold' },
  dialog: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10, zIndex: 50 },
  dialogTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 5 },
  dialogSub: { fontSize: 14, color: '#666', marginBottom: 15 },
  btnGreen: { backgroundColor: '#4CD964', padding: 15, borderRadius: 8, alignItems: 'center', width: '100%', minHeight: 48 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  hud: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  hudTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10, color: '#111' },
  hudBadge: { padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  hudBadgeText: { color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' },
  hudBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', minHeight: 48 },
});