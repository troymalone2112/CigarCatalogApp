import { JournalEntry, SerializedJournalEntry } from '../types';

export const serializeJournalEntry = (entry: JournalEntry): SerializedJournalEntry => ({
  ...entry,
  date:
    entry.date instanceof Date
      ? entry.date.toISOString()
      : new Date(entry.date).toISOString(),
});

export const deserializeJournalEntry = (
  entry: SerializedJournalEntry,
): JournalEntry => ({
  ...entry,
  date: entry.date ? new Date(entry.date) : new Date(),
});







