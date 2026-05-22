import { useCallback, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SliceResult } from "./useSliceGeneration";

type SelectionBox = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null;

interface UseSliceSelectionOptions {
  slices: SliceResult[];
  previewRef: RefObject<HTMLDivElement | null>;
}

export function useSliceSelection({
  slices,
  previewRef,
}: UseSliceSelectionOptions) {
  const [selectedSliceNames, setSelectedSliceNames] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionDraggedRef = useRef(false);
  const clickedSliceRef = useRef<string | null>(null);
  const clickMetaKeyRef = useRef(false);

  const selectedSliceSet = useMemo(
    () => new Set(selectedSliceNames),
    [selectedSliceNames],
  );

  const clearSelection = useCallback(() => {
    setSelectedSliceNames([]);
    setSelectionBox(null);
  }, []);

  const selectAllSlices = useCallback(() => {
    setSelectedSliceNames(slices.map((s) => s.name));
  }, [slices]);

  const clearSliceSelection = useCallback(() => {
    setSelectedSliceNames([]);
  }, []);

  const toggleSliceSelection = useCallback((name: string) => {
    setSelectedSliceNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }, []);

  const updateSelectionFromBox = useCallback(
    (box: NonNullable<SelectionBox>) => {
      if (!previewRef.current) return;
      const minX = Math.min(box.startX, box.currentX);
      const maxX = Math.max(box.startX, box.currentX);
      const minY = Math.min(box.startY, box.currentY);
      const maxY = Math.max(box.startY, box.currentY);
      const next: string[] = [];
      previewRef.current
        .querySelectorAll<HTMLElement>("[data-slice-card]")
        .forEach((card) => {
          const name = card.dataset.sliceName;
          if (!name) return;
          const rect = card.getBoundingClientRect();
          if (
            minX < rect.right &&
            maxX > rect.left &&
            minY < rect.bottom &&
            maxY > rect.top
          ) {
            next.push(name);
          }
        });
      setSelectedSliceNames(next);
    },
    [previewRef],
  );

  const handlePreviewPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!slices.length) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-slice-download]")
      )
        return;
      if (event.button !== 0) return;

      const cardEl =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-slice-card]")
          : null;
      clickedSliceRef.current = cardEl?.dataset.sliceName ?? null;
      clickMetaKeyRef.current = event.metaKey || event.ctrlKey;

      selectionStartRef.current = { x: event.clientX, y: event.clientY };
      selectionDraggedRef.current = false;
      setSelectionBox({
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [slices],
  );

  const handlePreviewPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectionStartRef.current) return;
      const start = selectionStartRef.current;
      const box = {
        startX: start.x,
        startY: start.y,
        currentX: event.clientX,
        currentY: event.clientY,
      };
      setSelectionBox(box);
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5) {
        selectionDraggedRef.current = true;
        updateSelectionFromBox(box);
      }
    },
    [updateSelectionFromBox],
  );

  const handlePreviewPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectionStartRef.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!selectionDraggedRef.current) {
        const name = clickedSliceRef.current;
        if (name) {
          if (clickMetaKeyRef.current) {
            toggleSliceSelection(name);
          } else {
            setSelectedSliceNames((prev) =>
              prev.length === 1 && prev[0] === name ? [] : [name],
            );
          }
        } else {
          clearSliceSelection();
        }
      }
      clickedSliceRef.current = null;
      selectionStartRef.current = null;
      selectionDraggedRef.current = false;
      setSelectionBox(null);
    },
    [toggleSliceSelection, clearSliceSelection],
  );

  return {
    selectedSliceNames,
    selectionBox,
    selectedSliceSet,
    selectionDraggedRef,
    clearSelection,
    selectAllSlices,
    clearSliceSelection,
    handlePreviewPointerDown,
    handlePreviewPointerMove,
    handlePreviewPointerUp,
  };
}
