import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storage/storageService';
import { Api } from '../services/api';

export interface StatsSummary {
  added: number;
  smoked: number;
  spend: number;
  avgRating: number;
}

type Timeframe = 'last30' | 'last6m' | 'last12m' | 'all';

interface CacheRecord {
  data: StatsSummary;
  lastUpdated: number;
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const memoryCache = new Map<string, CacheRecord>();

function cacheKey(userId: string, timeframe: Timeframe, humidorId?: string) {
  return `stats_${timeframe}_${userId}_${humidorId || 'all'}`;
}

async function getCached(userId: string, timeframe: Timeframe, humidorId?: string) {
  const key = cacheKey(userId, timeframe, humidorId);
  const mem = memoryCache.get(key);
  const now = Date.now();
  if (mem && now - mem.lastUpdated < CACHE_DURATION_MS) return mem.data;
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    try {
      const parsed: CacheRecord = JSON.parse(raw);
      if (now - parsed.lastUpdated < CACHE_DURATION_MS) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    } catch {}
  }
  return null;
}

async function setCached(userId: string, timeframe: Timeframe, data: StatsSummary, humidorId?: string) {
  const key = cacheKey(userId, timeframe, humidorId);
  const record: CacheRecord = { data, lastUpdated: Date.now() };
  memoryCache.set(key, record);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch {}
}

async function computeStats(
  userId: string,
  timeframe: Timeframe,
  humidorId?: string,
): Promise<StatsSummary> {
  // Use raw records from Api for richer timestamps; fall back to StorageService if needed
  const [inventoryRaw, journal] = await Promise.all([
    Api.inventory
      .list(userId, humidorId)
      .catch(async () => (await StorageService.getInventory(humidorId)) as any),
    StorageService.getJournalEntries(),
  ]);

  const now = Date.now();
  let cutoff: number | null = null;
  if (timeframe === 'last30') cutoff = now - 30 * 24 * 60 * 60 * 1000;
  else if (timeframe === 'last6m') cutoff = now - 183 * 24 * 60 * 60 * 1000;
  else if (timeframe === 'last12m') cutoff = now - 365 * 24 * 60 * 60 * 1000;
  else cutoff = null; // all time

  // Inventory within window
  const invInWindow = (inventoryRaw as any[]).filter((rec: any) => {
    const dStr = rec.purchase_date || rec.date_acquired || rec.created_at || rec.updated_at;
    if (!dStr) return false;
    const d = new Date(dStr as string);
    if (isNaN(d.getTime())) return false;
    return cutoff ? d.getTime() >= cutoff : true;
  });
  const added = invInWindow.reduce((s: number, rec: any) => s + (rec.quantity || 0), 0);
  const spend = invInWindow.reduce(
    (s: number, rec: any) => s + ((rec.price_paid || 0) * (rec.quantity || 1)),
    0,
  );

  // Journal within window (global, not per-humidor due to schema)
  const jourInWindow = journal.filter((e: any) => {
    const d: Date = e.date instanceof Date ? e.date : new Date(e.date);
    return cutoff ? d.getTime() >= cutoff : true;
  });
  const smoked = jourInWindow.length;
  const ratings = jourInWindow
    .map((e: any) => Number(e.rating?.overall || 0))
    .filter((n: number) => n > 0);
  const avgRating = ratings.length
    ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2))
    : 0;

  return { added, smoked, spend: Number(spend.toFixed(2)), avgRating };
}

export const StatsService = {
  async getLast30Days(userId: string, humidorId?: string): Promise<StatsSummary> {
    const cached = await getCached(userId, 'last30', humidorId);
    if (cached) return cached;
    const data = await computeStats(userId, 'last30', humidorId);
    await setCached(userId, 'last30', data, humidorId);
    return data;
  },

  async getLastSixMonths(userId: string, humidorId?: string): Promise<StatsSummary> {
    const cached = await getCached(userId, 'last6m', humidorId);
    if (cached) return cached;
    const data = await computeStats(userId, 'last6m', humidorId);
    await setCached(userId, 'last6m', data, humidorId);
    return data;
  },

  async getLastTwelveMonths(userId: string, humidorId?: string): Promise<StatsSummary> {
    const cached = await getCached(userId, 'last12m', humidorId);
    if (cached) return cached;
    const data = await computeStats(userId, 'last12m', humidorId);
    await setCached(userId, 'last12m', data, humidorId);
    return data;
  },

  async getAllTime(userId: string, humidorId?: string): Promise<StatsSummary> {
    const cached = await getCached(userId, 'all', humidorId);
    if (cached) return cached;
    const data = await computeStats(userId, 'all', humidorId);
    await setCached(userId, 'all', data, humidorId);
    return data;
  },

  async clearCache(userId?: string) {
    if (!userId) {
      memoryCache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const statKeys = keys.filter((k) => k.startsWith('stats_'));
      await AsyncStorage.multiRemove(statKeys);
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const statKeys = keys.filter((k) => k.includes(`_${userId}_`));
    await AsyncStorage.multiRemove(statKeys);
    Array.from(memoryCache.keys()).forEach((k) => {
      if (k.includes(`_${userId}_`)) memoryCache.delete(k);
    });
  },
};


