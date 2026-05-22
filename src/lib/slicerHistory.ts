import type { SlicerHistoryEntry } from "../types";
import {
  storeImage,
  getImage,
  getAllSlicerHistory,
  putSlicerHistoryEntry,
  deleteSlicerHistoryEntry,
} from "./db";

export type { SlicerHistoryEntry };

const MAX_ENTRIES = 30;
const THUMB_SIZE = 80;

export async function getSlicerHistory(): Promise<SlicerHistoryEntry[]> {
  const entries = await getAllSlicerHistory();
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveSlicerEntry(
  dataUrl: string,
  cols: number,
  rows: number,
  vLines: number[],
  hLines: number[],
): Promise<SlicerHistoryEntry> {
  const [imageId, thumb] = await Promise.all([
    storeImage(dataUrl, "upload"),
    createThumb(dataUrl, THUMB_SIZE),
  ]);
  const entry: SlicerHistoryEntry = {
    id: crypto.randomUUID(),
    imageId,
    thumb,
    timestamp: Date.now(),
    cols,
    rows,
    vLines: [...vLines],
    hLines: [...hLines],
  };
  await putSlicerHistoryEntry(entry);

  const all = await getAllSlicerHistory();
  const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
  if (sorted.length > MAX_ENTRIES) {
    await Promise.all(
      sorted.slice(MAX_ENTRIES).map((e) => deleteSlicerHistoryEntry(e.id)),
    );
  }

  return entry;
}

export async function deleteSlicerEntry(id: string): Promise<void> {
  await deleteSlicerHistoryEntry(id);
}

export async function loadSlicerImage(imageId: string): Promise<string | null> {
  const stored = await getImage(imageId);
  return stored?.dataUrl ?? null;
}

function createThumb(src: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas
        .getContext("2d")
        ?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => reject(new Error("缩略图生成失败"));
    img.src = src;
  });
}
