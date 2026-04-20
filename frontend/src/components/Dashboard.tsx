import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface DashboardProps {
    testerId: string;
    onEnterStadium: () => void;
    onGoBack: () => void;
}

export function Dashboard({ testerId, onEnterStadium, onGoBack }: DashboardProps) {
    const [scanned, setScanned] = useState(false);

    // Pre-flight Checklist mapped out logically
    const availableAmenities = [
        { name: 'Food Court West', icon: '🍔' },
        { name: 'Entrance Gates', icon: '🚪' },
        { name: 'VIP Washrooms', icon: '🚻' }
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
            {/* Top Navigation / Command Header */}
            <View style={styles.safeHeaderRow}>
                <TouchableOpacity onPress={onGoBack} style={styles.backButtonSafe}>
                   <Text style={styles.backTextStr}>{"< Profile Switch"}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.header}>
                <View style={styles.profileBox}>
                    <View style={styles.avatar} />
                    <View>
                        <Text style={styles.profileLabel}>Fan Profile</Text>
                        <Text style={styles.profileText}>{testerId}</Text>
                    </View>
                </View>
                
                <TouchableOpacity onPress={() => setScanned(true)} style={styles.scannerBtn}>
                    <Text style={styles.scanIcon}>[ QR ]</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.titleContainer}>
                <Text style={styles.dashTitle}>Command Center</Text>
            </View>

            {/* Stadium Card Matrix */}
            <View style={[styles.card, !scanned && styles.blurredCard]}>
                {scanned ? (
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>Match: IPL Final 2026</Text>
                        <Text style={styles.cardSubtitle}>Location: Narendra Modi Stadium</Text>
                        
                        {/* Context Menu built natively providing UI awareness before map entry */}
                        <View style={styles.amenitiesContainer}>
                            <Text style={styles.amenityHeader}>Amenities Tracked (Live):</Text>
                            <View style={styles.amenitiesGrid}>
                                {availableAmenities.map(am => (
                                    <View key={am.name} style={styles.amenityPill}>
                                        <Text style={styles.amenityIcon}>{am.icon}</Text>
                                        <Text style={styles.amenityText}>{am.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.seatBox}>
                            <Text style={styles.seatText}>Zone A, Row 5, Seat 12</Text>
                        </View>

                        <TouchableOpacity style={styles.enterButton} onPress={onEnterStadium}>
                            <Text style={styles.enterBtnText}>Enter Stadium View</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cardContentCensored}>
                        <Text style={styles.lockIcon}>🎟️</Text>
                        <Text style={styles.lockText}>Ticket Required</Text>
                        <Text style={styles.lockSub}>Tap the QR Scanner to begin simulation</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 20 },
    safeHeaderRow: { width: '100%', marginBottom: 20 },
    backButtonSafe: { paddingVertical: 10 },
    backTextStr: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    profileBox: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', marginRight: 15 },
    profileLabel: { fontSize: 12, color: '#666', fontWeight: 'bold', textTransform: 'uppercase' },
    profileText: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    scannerBtn: { padding: 15, backgroundColor: '#111', borderRadius: 12 },
    scanIcon: { color: '#00FF41', fontWeight: 'bold', fontSize: 16 },
    titleContainer: { marginBottom: 30 },
    dashTitle: { fontSize: 28, fontWeight: '900', color: '#111' },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, minHeight: 300, justifyContent: 'center' },
    blurredCard: { backgroundColor: '#e0e0e0', opacity: 0.9 },
    cardContent: { flex: 1 },
    cardContentCensored: { alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    cardSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
    
    // Feature Menu Preflight
    amenitiesContainer: { marginBottom: 25 },
    amenityHeader: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10, textTransform: 'uppercase' },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    amenityPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    amenityIcon: { fontSize: 16, marginRight: 6 },
    amenityText: { fontSize: 14, color: '#333', fontWeight: '600' },

    seatBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 30 },
    seatText: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center' },
    enterButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
    enterBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    lockIcon: { fontSize: 40, marginBottom: 15 },
    lockText: { fontSize: 20, fontWeight: 'bold', color: '#555' },
    lockSub: { fontSize: 14, color: '#888', marginTop: 5 }
});
