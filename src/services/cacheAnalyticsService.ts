// Lightweight analytics helper used by journal caching flow.
// Previously this module was optional; providing it here prevents dynamic import errors.

export const CacheAnalyticsService = {
  async recordCacheEvent(eventName: string, payload: Record<string, unknown> = {}) {
    try {
      // In production, this is where we'd forward to a real analytics provider.
      // For now keep it silent to avoid console noise while still resolving the promise.
      if (__DEV__) {
        console.debug('🧠 CacheAnalyticsService:', eventName, payload);
      }
    } catch (error) {
      // Swallow analytics errors – these events are non-critical.
      if (__DEV__) {
        console.warn('CacheAnalyticsService failed to record event:', error);
      }
    }
  },
};

export default CacheAnalyticsService;


