/**
 * TrafficStatusBar Component
 *
 * Displays a real-time congestion indicator bar at the top of the screen.
 * Changes color from green to red based on the current occupancy ratio.
 *
 * @module components/TrafficStatusBar
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import type { TrafficStatusBarProps } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Congestion threshold — ratio above which the zone is considered congested */
const CONGESTION_THRESHOLD = 0.8;

/**
 * Determines the display text and color for a given congestion ratio.
 * @param ratio - Current occupancy ratio (0.0 to 1.0)
 * @returns Object with status text and background color
 */
function getCongestionDisplay(ratio: number): { text: string; color: string } {
  if (ratio >= CONGESTION_THRESHOLD) {
    return { text: 'Gate 1: Heavy Traffic', color: '#FF3B30' };
  }
  return { text: 'Gate 1: Clear', color: '#4CD964' };
}

export const TrafficStatusBar: React.FC<TrafficStatusBarProps> = ({ currentPings, capacity }) => {
  const ratio = capacity > 0 ? currentPings / capacity : 0;
  const { text, color } = getCongestionDisplay(ratio);
  const percentFull = Math.round(ratio * 100);

  return (
    <View
      style={[styles.bar, { backgroundColor: color }]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Traffic status: ${text}. ${percentFull} percent capacity.`}
      accessibilityLiveRegion="polite"
    >
      <Text
        style={styles.text}
        accessibilityRole="text"
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    width: SCREEN_WIDTH,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});