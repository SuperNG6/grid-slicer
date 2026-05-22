import { useCallback, useEffect, useRef } from "react";
import { DownloadIcon, GridIcon, PlusIcon, TrashIcon } from "./icons";
import { type SlicerHistoryEntry, loadSlicerImage } from "../lib/slicerHistory";
import { useSlicerImage } from "../hooks/useSlicerImage";
import {
  useSlicerLines,
  clampCount,
  MAX_GRID_COUNT,
} from "../hooks/useSlicerLines";
import { useSliceGeneration } from "../hooks/useSliceGeneration";
import { useSliceSelection } from "../hooks/useSliceSelection";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

interface GridSplitPageProps {
  splitImageId: string | null;
  splitImageDataUrl: string | null;
  setSplitImageId: (id: string | null) => void;
  setSplitImageDataUrl: (url: string | null) => void;
  showToast: (msg: string, type?: string) => void;
  restoreEntry?: SlicerHistoryEntry | null;
  onRestored?: () => void;
  onHistoryUpdated?: () => void | Promise<void>;
}

export default function GridSplitPage({
  splitImageId,
  splitImageDataUrl,
  setSplitImageId,
  setSplitImageDataUrl,
  showToast,
  restoreEntry,
  onRestored,
  onHistoryUpdated,
}: GridSplitPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { src, image } = useSlicerImage({
    imageId: splitImageId,
    splitImageDataUrl,
    setSplitImageDataUrl,
    setSplitImageId,
    showToast,
  });

  const lines = useSlicerLines({ stageRef });

  const generation = useSliceGeneration({
    image,
    src,
    verticalLines: lines.verticalLines,
    horizontalLines: lines.horizontalLines,
    cols: lines.cols,
    rows: lines.rows,
    showToast: showToast as (msg: string, type: "success" | "error") => void,
    onHistoryUpdated,
  });

  const selection = useSliceSelection({
    slices: generation.slices,
    previewRef,
  });

  const { clearSlices, generateSlices, downloadZip, isProcessing, slices } =
    generation;
  const {
    clearSelection,
    selectAllSlices,
    clearSliceSelection,
    selectedSliceNames,
    selectedSliceSet,
    selectionBox,
    selectionDraggedRef,
    handlePreviewPointerDown,
    handlePreviewPointerMove,
    handlePreviewPointerUp,
  } = selection;
  const {
    cols,
    rows,
    setCols,
    setRows,
    verticalLines,
    horizontalLines,
    selectedLine,
    dragging,
    setSelectedLine,
    setDragging,
    applyGridState,
    clearAllLinesState,
    addLineState,
    deleteSelectedLineState,
    handlePointerMove: linesHandlePointerMove,
    handlePointerUp,
  } = lines;

  const clearAll = useCallback(() => {
    clearSlices();
    clearSelection();
  }, [clearSlices, clearSelection]);

  const applyGrid = useCallback(
    (nextCols = cols, nextRows = rows) => {
      applyGridState(nextCols, nextRows);
      clearAll();
    },
    [applyGridState, cols, rows, clearAll],
  );

  const clearAllLines = useCallback(() => {
    clearAllLinesState();
    clearAll();
  }, [clearAllLinesState, clearAll]);

  const addLine = useCallback(
    (axis: "vertical" | "horizontal") => {
      addLineState(axis);
      clearAll();
    },
    [addLineState, clearAll],
  );

  const deleteSelectedLine = useCallback(() => {
    deleteSelectedLineState();
    clearAll();
  }, [deleteSelectedLineState, clearAll]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      linesHandlePointerMove(event);
      clearSlices();
      clearSelection();
    },
    [dragging, linesHandlePointerMove, clearSlices, clearSelection],
  );

  const restoreEntryId = restoreEntry?.id;
  useEffect(() => {
    if (!restoreEntry) return;
    lines.resetLines(
      restoreEntry.cols,
      restoreEntry.rows,
      restoreEntry.vLines,
      restoreEntry.hLines,
    );
    generation.clearSlices();
    selection.clearSelection();
    generation.resetFingerprint();
    loadSlicerImage(restoreEntry.imageId)
      .then((dataUrl) => {
        if (dataUrl) setSplitImageDataUrl(dataUrl);
      })
      .catch(() => {})
      .finally(() => onRestored?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreEntryId]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件", "error");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSplitImageDataUrl(dataUrl);
    } catch (err) {
      showToast(
        `读取图片失败：${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const totalPieces = (verticalLines.length + 1) * (horizontalLines.length + 1);
  const selectedLabel = selectedLine
    ? `${selectedLine.axis === "vertical" ? "纵线" : "横线"} ${selectedLine.index + 1}`
    : "未选择";

  const allLineItems = [
    ...verticalLines.map((line, index) => ({
      axis: "vertical" as const,
      line,
      index,
    })),
    ...horizontalLines.map((line, index) => ({
      axis: "horizontal" as const,
      line,
      index,
    })),
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50/70 pb-10 dark:bg-gray-950">
      <div className="safe-area-x mx-auto flex max-w-7xl flex-col gap-4 py-4">
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-white/[0.08]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              宫格图切分工作台
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-white/[0.06]">
              {image
                ? `${image.naturalWidth}×${image.naturalHeight}`
                : "未选择图片"}
            </span>
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-white/[0.06]">
              {lines.verticalLines.length} 条纵线
            </span>
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-white/[0.06]">
              {lines.horizontalLines.length} 条横线
            </span>
            <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-white/[0.06]">
              预计 {totalPieces} 张
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-h-[520px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  画布与切线
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  点击线条选中，拖动改变位置
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
              >
                选择图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>

            <div className="flex min-h-[460px] items-center justify-center bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] p-4 dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.04)_75%),linear-gradient(45deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.04)_75%)]">
              {src ? (
                <div
                  ref={stageRef}
                  className="relative inline-flex max-h-[65vh] max-w-full touch-none overflow-hidden rounded-lg bg-black/90 shadow-2xl"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <img
                    src={src}
                    className="block max-h-[65vh] max-w-full object-contain"
                    alt=""
                  />
                  <div className="absolute inset-0">
                    {verticalLines.map((left, index) => (
                      <button
                        key={`v-${index}`}
                        type="button"
                        className={`absolute top-0 h-full w-6 -translate-x-1/2 cursor-ew-resize ${
                          selectedLine?.axis === "vertical" &&
                          selectedLine.index === index
                            ? "text-blue-300"
                            : "text-white/85"
                        }`}
                        style={{ left: `${left}%` }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setSelectedLine({ axis: "vertical", index });
                          setDragging({ axis: "vertical", index });
                        }}
                        aria-label="纵向分割线"
                      >
                        <span className="mx-auto block h-full w-0.5 bg-current shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" />
                      </button>
                    ))}
                    {horizontalLines.map((top, index) => (
                      <button
                        key={`h-${index}`}
                        type="button"
                        className={`absolute left-0 h-6 w-full -translate-y-1/2 cursor-ns-resize ${
                          selectedLine?.axis === "horizontal" &&
                          selectedLine.index === index
                            ? "text-blue-300"
                            : "text-white/85"
                        }`}
                        style={{ top: `${top}%` }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setSelectedLine({ axis: "horizontal", index });
                          setDragging({ axis: "horizontal", index });
                        }}
                        aria-label="横向分割线"
                      >
                        <span className="my-auto block h-0.5 w-full bg-current shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-72 w-full max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/80 p-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-white/[0.12] dark:bg-gray-900/70 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10"
                >
                  <GridIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    选择一张图片开始切分
                  </span>
                  <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    支持本页上传图片
                  </span>
                </button>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <GridIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    宫格规格
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    列 × 行，禁止手输符号
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <NumberBox label="列" value={cols} onChange={setCols} />
                <span className="pb-2 text-lg font-semibold text-gray-300 dark:text-gray-600">
                  ×
                </span>
                <NumberBox label="行" value={rows} onChange={setRows} />
              </div>
              <button
                onClick={() => applyGrid()}
                className="mt-3 w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                应用宫格
              </button>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                切线管理
              </h2>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                当前选中：{selectedLabel}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => addLine("vertical")}
                  className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.05]"
                >
                  <PlusIcon className="h-4 w-4" />
                  加纵线
                </button>
                <button
                  onClick={() => addLine("horizontal")}
                  className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.05]"
                >
                  <PlusIcon className="h-4 w-4" />
                  加横线
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={deleteSelectedLine}
                  disabled={!selectedLine}
                  className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  <TrashIcon className="h-4 w-4" />
                  删选中
                </button>
                <button
                  onClick={clearAllLines}
                  disabled={!verticalLines.length && !horizontalLines.length}
                  className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  <TrashIcon className="h-4 w-4" />
                  删除所有切线
                </button>
              </div>

              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-white/[0.04]">
                {allLineItems.length === 0 ? (
                  <div className="py-4 text-center text-gray-400">暂无切线</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {allLineItems.map((item) => (
                      <button
                        key={`${item.axis}-${item.index}`}
                        onClick={() =>
                          setSelectedLine({
                            axis: item.axis,
                            index: item.index,
                          })
                        }
                        className={`flex items-center justify-between rounded px-2 py-1 text-left transition ${
                          selectedLine?.axis === item.axis &&
                          selectedLine.index === item.index
                            ? "bg-blue-500 text-white"
                            : "text-gray-500 hover:bg-white dark:text-gray-300 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <span>
                          {item.axis === "vertical" ? "纵线" : "横线"}{" "}
                          {item.index + 1}
                        </span>
                        <span>{formatPercent(item.line)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                导出
              </h2>
              <div className="mt-3 grid gap-2">
                <button
                  onClick={() => void generateSlices()}
                  disabled={!image || isProcessing}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  <GridIcon className="h-4 w-4" />
                  {isProcessing ? "生成中..." : "生成切片预览"}
                </button>
                <button
                  onClick={() =>
                    void downloadZip(
                      selectedSliceNames.length
                        ? selectedSliceNames
                        : slices.map((s) => s.name),
                    )
                  }
                  disabled={!slices.length}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <DownloadIcon className="h-4 w-4" />
                  {selectedSliceNames.length
                    ? "打包下载选中 ZIP"
                    : "打包下载全部图片 ZIP"}
                </button>
                <button
                  onClick={clearAll}
                  disabled={!slices.length}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
                >
                  清空预览结果
                </button>
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                切片预览
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                鼠标拖框选择切片；只有选中的切片会被导出
              </p>
            </div>
            <div className="flex items-center gap-2">
              {slices.length > 0 && (
                <>
                  <button
                    onClick={selectAllSlices}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearSliceSelection}
                    disabled={!selectedSliceNames.length}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  >
                    清空选择
                  </button>
                </>
              )}
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                已选 {selectedSliceNames.length} / {slices.length}
              </span>
            </div>
          </div>
          {slices.length ? (
            <div
              ref={previewRef}
              className="relative grid touch-none grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
            >
              {slices.map((slice) => (
                <div
                  key={slice.name}
                  data-slice-card
                  data-slice-name={slice.name}
                  className={`group relative overflow-hidden rounded-lg border bg-white text-left transition dark:bg-gray-950 ${
                    selectedSliceSet.has(slice.name)
                      ? "border-blue-500 ring-2 ring-blue-500/40"
                      : "border-gray-200 hover:border-blue-200 hover:shadow-md dark:border-white/[0.08] dark:hover:border-blue-500/40"
                  }`}
                  title="点击选择，或拖框批量选择"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-black/30">
                    <img
                      src={slice.url}
                      className="h-full w-full object-contain"
                      alt=""
                    />
                  </div>
                  {selectedSliceSet.has(slice.name) && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-sm">
                      ✓
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-2 py-1.5 text-[11px] text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
                    <span className="truncate">{slice.name}</span>
                    <span className="shrink-0">
                      {slice.width}×{slice.height}
                    </span>
                  </div>
                  {selectedSliceSet.has(slice.name) && (
                    <button
                      data-slice-download
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadBlob(slice.blob, slice.name);
                      }}
                      className="absolute inset-x-2 bottom-8 rounded-md bg-gray-900/90 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-gray-950"
                    >
                      下载此切片
                    </button>
                  )}
                </div>
              ))}
              {selectionBox && selectionDraggedRef.current && (
                <div
                  className="pointer-events-none fixed z-[80] border border-blue-500/70 bg-blue-500/15"
                  style={{
                    left: Math.min(selectionBox.startX, selectionBox.currentX),
                    top: Math.min(selectionBox.startY, selectionBox.currentY),
                    width: Math.abs(
                      selectionBox.currentX - selectionBox.startX,
                    ),
                    height: Math.abs(
                      selectionBox.currentY - selectionBox.startY,
                    ),
                  }}
                />
              )}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              生成切片后会在这里预览结果
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function NumberBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        type="number"
        min={1}
        max={MAX_GRID_COUNT}
        value={value}
        onChange={(e) => onChange(clampCount(Number(e.target.value)))}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-100 dark:focus:ring-blue-500/20"
      />
    </label>
  );
}
