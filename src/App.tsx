import { useCallback, useEffect, useRef, useState } from "react";
import GridSplitPage from "./components/GridSplitPage";
import SlicerSidebar from "./components/SlicerSidebar";
import Toast from "./components/Toast";
import { useSlicerHistory } from "./hooks/useSlicerHistory";
import type { SlicerHistoryEntry } from "./types";

export default function App() {
  const [splitImageDataUrl, setSplitImageDataUrl] = useState<string | null>(
    null,
  );
  const [splitImageId, setSplitImageId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(
    null,
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<SlicerHistoryEntry | null>(
    null,
  );
  const { history, refresh, deleteEntry, clearAll } = useSlicerHistory();

  const showToast = useCallback((msg: string, type = "info") => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <>
      <SlicerSidebar
        history={history}
        onRestore={setRestoreEntry}
        onDelete={deleteEntry}
        onClearAll={clearAll}
      />
      <main className="md:pl-72">
        <GridSplitPage
          splitImageId={splitImageId}
          splitImageDataUrl={splitImageDataUrl}
          setSplitImageId={setSplitImageId}
          setSplitImageDataUrl={setSplitImageDataUrl}
          showToast={showToast}
          restoreEntry={restoreEntry}
          onRestored={() => setRestoreEntry(null)}
          onHistoryUpdated={refresh}
        />
      </main>
      <Toast toast={toast} />
    </>
  );
}
