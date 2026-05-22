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
  const { history, refresh, deleteEntry } = useSlicerHistory();

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
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-white/[0.08] dark:bg-gray-950/90">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            宫格切图工具
          </span>
        </div>
      </header>
      <SlicerSidebar
        history={history}
        onRestore={setRestoreEntry}
        onDelete={deleteEntry}
      />
      <main className="pt-14 md:pl-72">
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
