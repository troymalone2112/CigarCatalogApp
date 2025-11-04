import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from './api';
import { NotificationService } from './notificationService';

interface InventoryRecord {
  id: string;
  user_id: string;
  humidor_id: string;
  cigar_data: any;
  quantity: number;
  date_acquired?: string;
  created_at?: string;
  updated_at?: string;
  aging_preference_months?: number | null;
  aging_preference_weeks?: number | null;
  aging_preference_days?: number | null;
}

const LAST_RUN_KEY = (userId: string) => `aging_check_last_run_${userId}`;
const SENT_KEY = (userId: string) => `aging_sent_${userId}`; // map of recordId-> {upcoming:boolean,ready:boolean}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveStartDate(rec: InventoryRecord): Date | null {
  const src = rec.date_acquired || rec.created_at || rec.updated_at;
  if (!src) return null;
  const d = new Date(src);
  return isNaN(d.getTime()) ? null : d;
}

function resolveAgingDays(rec: InventoryRecord): number {
  const days = (rec as any).aging_preference_days as number | undefined;
  const weeks = (rec as any).aging_preference_weeks as number | undefined;
  const months = rec.aging_preference_months as number | undefined;
  let total = 0;
  if (days && days > 0) total += days;
  if (weeks && weeks > 0) total += weeks * 7;
  if (months && months > 0) total += Math.round(months * 30);
  return total;
}

export const AgingAlertService = {
  // Run at most once per day
  async runDailyCheck(userId: string): Promise<void> {
    try {
      const today = new Date();
      const lastRunStr = await AsyncStorage.getItem(LAST_RUN_KEY(userId));
      if (lastRunStr) {
        const lastRun = new Date(lastRunStr);
        if (
          lastRun.getFullYear() === today.getFullYear() &&
          lastRun.getMonth() === today.getMonth() &&
          lastRun.getDate() === today.getDate()
        ) {
          return; // already ran today
        }
      }

      const inventory = (await Api.inventory.list(userId)) as any as InventoryRecord[];
      await this.process(userId, inventory);
      await AsyncStorage.setItem(LAST_RUN_KEY(userId), today.toISOString());
    } catch (e) {
      // Non-fatal
    }
  },

  async process(userId: string, items: InventoryRecord[]) {
    const sentRaw = (await AsyncStorage.getItem(SENT_KEY(userId))) || '{}';
    const sent: Record<string, { upcoming?: boolean; ready?: boolean }> = JSON.parse(sentRaw);
    const now = new Date();

    for (const rec of items) {
      const start = resolveStartDate(rec);
      const agingDays = resolveAgingDays(rec);
      if (!start || agingDays <= 0) continue;

      const readyDate = addDays(start, agingDays);
      const upcomingDate = addDays(readyDate, -3);

      const state = sent[rec.id] || {};

      // Upcoming (3 days before)
      if (!state.upcoming && now >= upcomingDate && now < readyDate) {
        await NotificationService.add(userId, {
          type: 'aging_upcoming',
          title: 'Aging Almost Done',
          message: `${rec.cigar_data?.brand || 'Cigar'} ${rec.cigar_data?.line || ''} will be ready soon`,
          data: { inventoryItemId: rec.id, humidorId: rec.humidor_id, cigar: rec.cigar_data, readyDate: readyDate.toISOString() },
        });
        state.upcoming = true;
      }

      // Ready
      if (!state.ready && now >= readyDate) {
        await NotificationService.add(userId, {
          type: 'aging_ready',
          title: 'Aging Complete',
          message: `${rec.cigar_data?.brand || 'Cigar'} ${rec.cigar_data?.line || ''} is ready to enjoy`,
          data: { inventoryItemId: rec.id, humidorId: rec.humidor_id, cigar: rec.cigar_data, readyDate: readyDate.toISOString() },
        });
        state.ready = true;
      }

      if (state.upcoming || state.ready) {
        sent[rec.id] = state;
      }
    }

    await AsyncStorage.setItem(SENT_KEY(userId), JSON.stringify(sent));
  },
};



