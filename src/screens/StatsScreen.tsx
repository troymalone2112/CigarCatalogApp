import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { StatsService } from '../services/statsService';
import { StorageService } from '../storage/storageService';
import { serializeJournalEntry } from '../utils/journalSerialization';
import { Api } from '../services/api';

interface MonthlyStat {
  month: string; // e.g., '2025-10'
  added: number;
  smoked: number; // journals count
  spend: number; // pricePaid * quantity
  avgRating?: number;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [humidors, setHumidors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedHumidorId, setSelectedHumidorId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'last30' | 'last6m' | 'last12m' | 'all'>('last30');
  const [updating, setUpdating] = useState(false);
  const [last30, setLast30] = useState({ added: 0, smoked: 0, spend: 0, avgRating: 0 });
  const [totals6m, setTotals6m] = useState({ added: 0, smoked: 0, spend: 0, avgRating: 0 });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) return;
        // load humidors for filter (once)
        try {
          const h = await Api.humidors.list(user.id);
          setHumidors(h.map((x: any) => ({ id: x.id, name: x.name })));
        } catch {}

        let tfSummary;
        if (timeframe === 'last30') tfSummary = await StatsService.getLast30Days(user.id, selectedHumidorId || undefined);
        else if (timeframe === 'last6m') tfSummary = await StatsService.getLastSixMonths(user.id, selectedHumidorId || undefined);
        else if (timeframe === 'last12m') tfSummary = await StatsService.getLastTwelveMonths(user.id, selectedHumidorId || undefined);
        else tfSummary = await StatsService.getAllTime(user.id, selectedHumidorId || undefined);
        const s6 = await StatsService.getLastSixMonths(user.id, selectedHumidorId || undefined);
        setLast30(tfSummary);
        setTotals6m(s6);

        // Load recent journals for the selected timeframe
        try {
          const all = await StorageService.getJournalEntries();
          const cutoff = getCutoffDate(timeframe);
          const filtered = cutoff
            ? all.filter((e: any) => {
                const d: Date = e.date instanceof Date ? e.date : new Date(e.date);
                return !isNaN(d.getTime()) && d.getTime() >= cutoff.getTime();
              })
            : all;
          // Already sorted by getJournalEntries newest first; keep latest 10
          setRecentEntries(filtered.slice(0, 10));
        } catch {}
      } finally {
        setLoading(false);
        setUpdating(false);
      }
    };
    load();
  }, [user, selectedHumidorId, timeframe]);

  const onSelectHumidor = useCallback((id: string | null) => {
    setUpdating(true);
    setSelectedHumidorId(id);
  }, []);

  const onSelectTimeframe = useCallback((tf: 'last30' | 'last6m' | 'last12m' | 'all') => {
    setUpdating(true);
    setTimeframe(tf);
  }, []);

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.fullScreenBackground}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stats…</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        {humidors.length > 0 && (
          <View style={styles.filterRow}>
            <FilterChip
              label="All"
              selected={!selectedHumidorId}
              onPress={() => onSelectHumidor(null)}
            />
            {humidors.map((h) => (
              <FilterChip
                key={h.id}
                label={h.name}
                selected={selectedHumidorId === h.id}
                onPress={() => onSelectHumidor(h.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.filterRow}>
          <FilterChip label="30d" selected={timeframe==='last30'} onPress={() => onSelectTimeframe('last30')} />
          <FilterChip label="6m" selected={timeframe==='last6m'} onPress={() => onSelectTimeframe('last6m')} />
          <FilterChip label="12m" selected={timeframe==='last12m'} onPress={() => onSelectTimeframe('last12m')} />
          <FilterChip label="All time" selected={timeframe==='all'} onPress={() => onSelectTimeframe('all')} />
        </View>
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={[styles.cardsRow, updating && { opacity: 0.5 }]}>
          <StatCard label="Added" value={String(last30.added)} />
          <StatCard label="Notes Logged" value={String(last30.smoked)} />
        </View>
        <View style={[styles.cardsRow, updating && { opacity: 0.5 }]}> 
          <StatCard label="Value" value={`$${Math.round(last30.spend)}`} />
          <StatCard label="Avg Rating" value={last30.avgRating ? `${last30.avgRating}/10` : '—'} />
        </View>

        <Text style={styles.sectionTitle}>Notes</Text>
        {recentEntries.length === 0 ? (
          <Text style={styles.emptyText}>No notes for this period</Text>
        ) : (
          <View style={styles.listContainer}>
            {recentEntries.map((entry: any) => (
              <Pressable
                key={entry.id}
                style={styles.entryRow}
                onPress={() =>
                  navigation.navigate(
                    'JournalEntryDetails' as never,
                    {
                      entry: serializeJournalEntry(entry),
                    } as never,
                  )
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>{entry.cigar?.brand}</Text>
                  <Text style={styles.entrySub}>{entry.cigar?.line}</Text>
                </View>
                <View>
                  <Text style={styles.entryMeta}>{new Date(entry.date).toLocaleDateString()}</Text>
                  {entry.rating?.overall ? (
                    <Text style={styles.entryRating}>{entry.rating.overall}/10</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
    >
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function toMonthKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function getLastSixMonthKeys(): string[] {
  const now = new Date();
  const res: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    res.push(toMonthKey(d));
  }
  return res;
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: 'short' });
}

function getCutoffDate(tf: 'last30' | 'last6m' | 'last12m' | 'all'): Date | null {
  const now = Date.now();
  if (tf === 'last30') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (tf === 'last6m') return new Date(now - 183 * 24 * 60 * 60 * 1000);
  if (tf === 'last12m') return new Date(now - 365 * 24 * 60 * 60 * 1000);
  return null;
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tobaccoBackgroundImage: {
    opacity: 0.25,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardLabel: {
    color: '#999999',
    fontSize: 12,
    marginBottom: 6,
  },
  cardValue: {
    color: '#DC851F',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 24,
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999999',
    fontSize: 12,
    marginTop: 12,
  },
  listContainer: {
    marginTop: 12,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    marginTop: 8,
  },
  entryTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },
  entrySub: {
    color: '#A16207',
    fontSize: 12,
  },
  entryMeta: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'right',
  },
  entryRating: {
    color: '#DC851F',
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#2a1a0a',
    borderColor: '#DC851F',
  },
  chipUnselected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333333',
  },
  chipText: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#DC851F',
    fontSize: 12,
    fontWeight: '600',
  },
});


