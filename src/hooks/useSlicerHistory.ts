import { useCallback, useEffect, useState } from "react";
import type { SlicerHistoryEntry } from "../types";
import {
  getSlicerHistory,
  deleteSlicerEntry,
  clearAllSlicerEntries,
} from "../lib/slicerHistory";

export function useSlicerHistory() {
  const [history, setHistory] = useState<SlicerHistoryEntry[]>([]);

  const refresh = useCallback(async () => {
    const entries = await getSlicerHistory();
    setHistory(entries);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const deleteEntry = useCallback(async (id: string) => {
    await deleteSlicerEntry(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    const removed = await clearAllSlicerEntries();
    setHistory([]);
    return removed;
  }, []);

  return { history, refresh, deleteEntry, clearAll };
}
