import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType =
  | 'inventory_add'
  | 'journal_saved'
  | 'aging_upcoming'
  | 'aging_ready'
  | 'generic';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO
  readAt?: string;
  data?: any;
}

const keyFor = (userId: string) => `inbox_${userId}`;

type Listener = (userId: string) => void;
const listeners = new Set<Listener>();
function notify(userId: string) {
  listeners.forEach((l) => {
    try {
      l(userId);
    } catch {}
  });
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const NotificationService = {
  async list(userId: string): Promise<AppNotification[]> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId));
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    const items = await this.list(userId);
    return items.filter((n) => !n.readAt).length;
  },

  async add(userId: string, notif: Omit<AppNotification, 'id' | 'createdAt'>): Promise<void> {
    const items = await this.list(userId);
    items.unshift({ id: generateId(), createdAt: new Date().toISOString(), ...notif });
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(items.slice(0, 200)));
    notify(userId);
  },

  async markAllRead(userId: string): Promise<void> {
    const items = await this.list(userId);
    const now = new Date().toISOString();
    const updated = items.map((n) => (n.readAt ? n : { ...n, readAt: now }));
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(updated));
    notify(userId);
  },

  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(keyFor(userId));
    notify(userId);
  },

  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};


