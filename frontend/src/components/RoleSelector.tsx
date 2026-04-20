/**
 * RoleSelector Component
 *
 * Allows users to select a simulated fan identity for the demo.
 * Each role maps to a unique entry route and seating assignment.
 *
 * @module components/RoleSelector
 */
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import type { RoleSelectorProps } from '../types';

/** Available tester profiles for the simulation */
const TESTER_PROFILES = [
  { index: 1, label: 'Tester 1', description: 'South Gate Entry' },
  { index: 2, label: 'Tester 2', description: 'North Gate Entry' },
  { index: 3, label: 'Tester 3', description: 'South Gate Entry' },
  { index: 4, label: 'Tester 4', description: 'South Gate Entry' },
] as const;

export function RoleSelector({ uid, onRoleSelected }: RoleSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = useCallback(async (testerIndex: number) => {
    const roleId = `User_${testerIndex}`;
    setIsLoading(true);
    setError(null);

    try {
      await setDoc(doc(db, 'users', roleId), {
        tester_id: roleId,
        uid,
        hasEntered: true,
        target_seat_id: `SF-2026-NMS-00${testerIndex}`,
        current_coords: { x: 500, y: 500 },
      });
      onRoleSelected(roleId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to bind role: ${errorMessage}`);
      console.error('Role selection error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [uid, onRoleSelected]);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Tester identity selection screen"
    >
      <Text style={styles.title} accessibilityRole="header">
        Select Tester Identity
      </Text>
      <Text style={styles.subtitle}>
        Each profile simulates a unique fan journey through the stadium
      </Text>

      {error && (
        <View
          style={styles.errorBox}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={error}
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {TESTER_PROFILES.map((profile) => (
        <TouchableOpacity
          key={profile.index}
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={() => handleSelectRole(profile.index)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={`Claim ${profile.label}: ${profile.description}`}
          accessibilityHint="Assigns this identity for the stadium simulation"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View>
              <Text style={styles.btnText}>Claim {profile.label}</Text>
              <Text style={styles.btnSubtext}>{profile.description}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginVertical: 8,
    width: '80%',
    alignItems: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#fff3f3',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '80%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
});
