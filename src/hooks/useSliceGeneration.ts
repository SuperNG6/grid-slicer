import { useCallback, useEffect, useRef, useState } from "react";
import { canvasToBlob } from "../lib/canvasImage";
import { saveSlicerEntry } from "../lib/slicerHistory";
import { makeStops } from "./useSlicerLines";
import { zipSync } from "fflate";

export type SliceResult = {
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

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

interface UseSliceGenerationOptions {
  image: HTMLImageElement | null;
  src: string;
  verticalLines: number[];
  horizontalLines: number[];
  cols: number;
  rows: number;
  showToast: (msg: string, type: "success" | "error") => void;
  onHistoryUpdated?: () => void | Promise<void>;
}

export function useSliceGeneration({
  image,
  src,
  verticalLines,
  horizontalLines,
  cols,
  rows,
  showToast,
  onHistoryUpdated,
}: UseSliceGenerationOptions) {
  const [slices, setSlices] = useState<SliceResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      slices.forEach((slice) => URL.revokeObjectURL(slice.url));
    },
    [slices],
  );

  const clearSlices = useCallback(() => {
    setSlices([]);
  }, []);

  const resetFingerprint = useCallback(() => {
    lastSavedFingerprintRef.current = null;
  }, []);

  const generateSlices = useCallback(
    async (linesOverride?: { vertical: number[]; horizontal: number[] }) => {
      if (!image) {
        showToast("请先选择图片", "error");
        return;
      }
      setIsProcessing(true);
      setSlices([]);

      const nextSlices: SliceResult[] = [];
      const vLines = linesOverride?.vertical ?? verticalLines;
      const hLines = linesOverride?.horizontal ?? horizontalLines;
      try {
        const xStops = makeStops(vLines, image.naturalWidth);
        const yStops = makeStops(hLines, image.naturalHeight);

        for (let row = 0; row < yStops.length - 1; row++) {
          for (let col = 0; col < xStops.length - 1; col++) {
            const sx = xStops[col];
            const sy = yStops[row];
            const sw = xStops[col + 1] - sx;
            const sh = yStops[row + 1] - sy;
            if (sw <= 0 || sh <= 0) continue;

            const canvas = document.createElement("canvas");
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("当前浏览器不支持 Canvas");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
            const blob = await canvasToBlob(canvas, "image/png");
            nextSlices.push({
              blob,
              url: URL.createObjectURL(blob),
              name: `grid-slice-r${row + 1}-c${col + 1}.png`,
              width: sw,
              height: sh,
            });
          }
        }

        setSlices(nextSlices);
        showToast(`已生成 ${nextSlices.length} 张切片`, "success");

        if (src) {
          const fingerprint = `${src.slice(0, 256)}|${cols}|${rows}|${vLines.join(",")}|${hLines.join(",")}`;
          if (fingerprint !== lastSavedFingerprintRef.current) {
            lastSavedFingerprintRef.current = fingerprint;
            saveSlicerEntry(src, cols, rows, vLines, hLines)
              .then(() => onHistoryUpdated?.())
              .catch(() => {});
          }
        }
      } catch (err) {
        nextSlices.forEach((s) => URL.revokeObjectURL(s.url));
        console.error(err);
        showToast(err instanceof Error ? err.message : "切分失败", "error");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      image,
      src,
      verticalLines,
      horizontalLines,
      cols,
      rows,
      showToast,
      onHistoryUpdated,
    ],
  );

  const downloadZip = useCallback(
    async (selectedSliceNames: string[]) => {
      const selectedSlices = slices.filter((slice) =>
        selectedSliceNames.includes(slice.name),
      );
      if (!selectedSlices.length) {
        showToast("请先拖选要导出的切片", "error");
        return;
      }
      const entries: Record<string, Uint8Array> = {};
      for (const slice of selectedSlices) {
        entries[`slices/${slice.name}`] = new Uint8Array(
          await slice.blob.arrayBuffer(),
        );
      }
      const zipped = zipSync(entries, { level: 6 });
      downloadBlob(
        new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }),
        `grid-slices-${Date.now()}.zip`,
      );
    },
    [slices, showToast],
  );

  return {
    slices,
    isProcessing,
    clearSlices,
    resetFingerprint,
    generateSlices,
    downloadZip,
  };
}
