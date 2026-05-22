import { useCallback, useState } from "react";
import type { RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type LineAxis = "vertical" | "horizontal";
export type LineState = { axis: LineAxis; index: number };
export type DragState = LineState | null;

const MIN_LINE_GAP = 1;
export const MAX_GRID_COUNT = 20;

export function clampCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_GRID_COUNT, Math.floor(value)));
}

function clampLine(value: number) {
  return Math.max(MIN_LINE_GAP, Math.min(100 - MIN_LINE_GAP, value));
}

function clampDraggedLine(value: number, lines: number[], index: number) {
  const min = index > 0 ? lines[index - 1] + MIN_LINE_GAP : MIN_LINE_GAP;
  const max =
    index < lines.length - 1
      ? lines[index + 1] - MIN_LINE_GAP
      : 100 - MIN_LINE_GAP;
  return Math.round(Math.max(min, Math.min(max, value)) * 10) / 10;
}

export function normalizeLines(lines: number[]) {
  return [
    ...new Set(lines.map((line) => Math.round(clampLine(line) * 10) / 10)),
  ].sort((a, b) => a - b);
}

export function linesFromCount(count: number) {
  const safeCount = clampCount(count);
  return Array.from(
    { length: Math.max(0, safeCount - 1) },
    (_, i) => ((i + 1) / safeCount) * 100,
  );
}

export function makeStops(lines: number[], size: number) {
  return [0, ...normalizeLines(lines), 100].map((pct) =>
    Math.round((pct / 100) * size),
  );
}

interface UseSlicerLinesOptions {
  stageRef: RefObject<HTMLDivElement | null>;
}

export function useSlicerLines({ stageRef }: UseSlicerLinesOptions) {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [verticalLines, setVerticalLines] = useState<number[]>(() =>
    linesFromCount(3),
  );
  const [horizontalLines, setHorizontalLines] = useState<number[]>(() =>
    linesFromCount(3),
  );
  const [selectedLine, setSelectedLine] = useState<LineState | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);

  const applyGridState = useCallback((nextCols: number, nextRows: number) => {
    const safeCols = clampCount(nextCols);
    const safeRows = clampCount(nextRows);
    setCols(safeCols);
    setRows(safeRows);
    setVerticalLines(normalizeLines(linesFromCount(safeCols)));
    setHorizontalLines(normalizeLines(linesFromCount(safeRows)));
    setSelectedLine(null);
  }, []);

  const clearAllLinesState = useCallback(() => {
    setVerticalLines([]);
    setHorizontalLines([]);
    setSelectedLine(null);
  }, []);

  const addLineState = useCallback(
    (axis: LineAxis) => {
      const lines = axis === "vertical" ? verticalLines : horizontalLines;
      const nextLine =
        lines.length === 0 ? 50 : Math.min(95, lines[lines.length - 1] + 10);
      const next = normalizeLines([...lines, nextLine]);
      if (axis === "vertical") setVerticalLines(next);
      else setHorizontalLines(next);
      const normalizedNext = Math.round(clampLine(nextLine) * 10) / 10;
      setSelectedLine({
        axis,
        index: next.findIndex((l) => Math.abs(l - normalizedNext) < 0.01),
      });
    },
    [verticalLines, horizontalLines],
  );

  const deleteSelectedLineState = useCallback(() => {
    if (!selectedLine) return;
    if (selectedLine.axis === "vertical") {
      setVerticalLines((lines) =>
        lines.filter((_, i) => i !== selectedLine.index),
      );
    } else {
      setHorizontalLines((lines) =>
        lines.filter((_, i) => i !== selectedLine.index),
      );
    }
    setSelectedLine(null);
  }, [selectedLine]);

  const updateDraggedLine = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const pct =
        dragging.axis === "vertical"
          ? ((clientX - rect.left) / rect.width) * 100
          : ((clientY - rect.top) / rect.height) * 100;
      if (dragging.axis === "vertical") {
        setVerticalLines((lines) =>
          lines.map((line, i) =>
            i === dragging.index ? clampDraggedLine(pct, lines, i) : line,
          ),
        );
      } else {
        setHorizontalLines((lines) =>
          lines.map((line, i) =>
            i === dragging.index ? clampDraggedLine(pct, lines, i) : line,
          ),
        );
      }
    },
    [dragging, stageRef],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateDraggedLine(event.clientX, event.clientY);
    },
    [dragging, updateDraggedLine],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const resetLines = useCallback(
    (newCols: number, newRows: number, vLines: number[], hLines: number[]) => {
      setCols(newCols);
      setRows(newRows);
      setVerticalLines(vLines);
      setHorizontalLines(hLines);
      setSelectedLine(null);
    },
    [],
  );

  return {
    cols,
    rows,
    verticalLines,
    horizontalLines,
    selectedLine,
    dragging,
    setCols,
    setRows,
    setSelectedLine,
    setDragging,
    applyGridState,
    clearAllLinesState,
    addLineState,
    deleteSelectedLineState,
    updateDraggedLine,
    handlePointerMove,
    handlePointerUp,
    resetLines,
  };
}
