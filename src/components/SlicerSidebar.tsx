import { useEffect, useRef, useState } from "react";
import type { SlicerHistoryEntry } from "../types";
import { TrashIcon } from "./icons";

function formatTime(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

interface Props {
  history: SlicerHistoryEntry[];
  onRestore: (entry: SlicerHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => Promise<number>;
}

export default function SlicerSidebar({
  history,
  onRestore,
  onDelete,
  onClearAll,
}: Props) {
  const [clearedCount, setClearedCount] = useState<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleClearAll = async () => {
    if (!history.length) return;
    const removed = await onClearAll();
    setClearedCount(removed);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setClearedCount(null), 3000);
  };

  return (
    <aside className="safe-area-x md:safe-area-top md:fixed md:left-0 md:top-0 md:bottom-0 md:z-30 md:w-72 md:border-r md:border-gray-200 md:bg-gray-50/90 md:px-3 md:py-4 md:backdrop-blur dark:md:border-white/[0.08] dark:md:bg-gray-950/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:h-full md:max-w-none">
        <div className="hidden text-base font-semibold tracking-tight text-gray-900 md:block dark:text-gray-100">
          宫格图切分工具
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm md:flex md:min-h-0 md:flex-1 md:flex-col dark:border-white/[0.08] dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-white/[0.06]">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              最近切图记录
            </h2>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
              {history.length}
            </span>
          </div>
          <div className="border-b border-gray-100 px-3 py-2 dark:border-white/[0.06]">
            <button
              onClick={handleClearAll}
              disabled={!history.length}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {clearedCount !== null
                ? `已清除 ${clearedCount} 条记录`
                : "清除全部历史"}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 md:max-h-none md:min-h-0 md:flex-1">
            {history.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                暂无切图记录
                <br />
                <span className="mt-1 block text-[11px]">
                  生成切片后自动保存
                </span>
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onRestore(entry)}
                    className="group w-full rounded-md px-2 py-2 text-left transition hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      {entry.thumb ? (
                        <img
                          src={entry.thumb}
                          className="h-9 w-9 shrink-0 rounded object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded bg-gray-200 dark:bg-white/[0.08]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                          {entry.vLines.length + 1} × {entry.hLines.length + 1}{" "}
                          宫格
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          {formatTime(entry.timestamp)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(entry.id, e)}
                        className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
                        title="删除记录"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
