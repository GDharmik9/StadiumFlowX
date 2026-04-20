/**
 * Type definitions for the StadiumFlow application.
 * Provides strict typing across all components and utilities.
 *
 * @module types
 */

/** 2D coordinate in the virtual 0-1000 stadium grid */
export interface VirtualCoordinate {
  x: number;
  y: number;
}

/** GPS coordinate (WGS84) */
export interface GPSCoordinate {
  lat: number;
  lng: number;
}

/** Congestion status levels */
export type CongestionStatus = 'green' | 'yellow' | 'orange' | 'red' | 'purple';

/** Application view states */
export type AppView = 'auth' | 'role_select' | 'dashboard' | 'simulation';

/** Toast notification types */
export type ToastType = 'info' | 'success' | 'warning';

/** Toast notification message */
export interface ToastMessage {
  type: ToastType;
  text: string;
}

/** Stadium zone from Firestore */
export interface StadiumZone {
  id: string;
  type: 'gate' | 'stand' | 'food_court' | 'washroom';
  capacity: number;
  current_pings: number;
  coordinates: VirtualCoordinate;
  status: CongestionStatus;
}

/** User/fan entity from Firestore */
export interface StadiumUser {
  tester_id: string;
  uid: string;
  hasEntered: boolean;
  target_seat_id: string;
  current_coords: VirtualCoordinate;
  scenario_deployed?: boolean;
  notification?: string | null;
}

/** Route metadata for simulated users */
export interface UserRoute {
  start: VirtualCoordinate;
  dest: VirtualCoordinate;
  seat: string;
}

/** Selected zone from map interaction */
export interface SelectedZone {
  id: string;
  status: CongestionStatus;
  coordinates: VirtualCoordinate;
  alternativeCoords: VirtualCoordinate | null;
}

/** GeoJSON Feature Properties for venue features */
export interface VenueFeatureProperties {
  id: string;
  feature_type: 'unit' | 'amenity' | 'opening';
  category: string;
  name: string;
  level: number;
  status?: CongestionStatus;
  color?: string;
  height?: number;
  base_height?: number;
  vx?: number;
  vy?: number;
}

/** Props for StadiumMap component */
export interface StadiumMapProps {
  userLocation: VirtualCoordinate;
  ticketTarget: VirtualCoordinate | null;
  navigationPath: VirtualCoordinate[];
  stadiumZones: StadiumZone[];
  allUsers: StadiumUser[];
  activeRole: string;
  onReroute: (target: VirtualCoordinate) => void;
  onTeleport: (coords: VirtualCoordinate) => void;
  onExit: () => void;
}

/** Props for Dashboard component */
export interface DashboardProps {
  testerId: string;
  onEnterStadium: () => void;
  onGoBack: () => void;
}

/** Props for RoleSelector component */
export interface RoleSelectorProps {
  uid: string;
  onRoleSelected: (roleId: string) => void;
}

/** Props for TrafficStatusBar component */
export interface TrafficStatusBarProps {
  currentPings: number;
  capacity: number;
}

/** Ghost agent simulation state */
export interface GhostState {
  coords: VirtualCoordinate;
  path: VirtualCoordinate[];
  step: number;
  waitTicks: number;
}
