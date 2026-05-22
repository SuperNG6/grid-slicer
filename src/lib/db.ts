import type { SlicerHistoryEntry } from "../types";

const DB_NAME = "grid-slicer";
const DB_VERSION = 1;
const STORE_IMAGES = "images";
const STORE_SLICER_HISTORY = "slicerHistory";
const THUMBNAIL_MAX_SIZE = 720;
const THUMBNAIL_QUALITY = 0.9;
const THUMBNAIL_VERSION = 2;

interface StoredImage {
  id: string;
  dataUrl: string;
  createdAt?: number;
  source?: string;
  width?: number;
  height?: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SLICER_HISTORY)) {
        db.createObjectStore(STORE_SLICER_HISTORY, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function getImage(id: string): Promise<StoredImage | undefined> {
  return dbTransaction(STORE_IMAGES, "readonly", (s) => s.get(id));
}

export function putImage(image: StoredImage): Promise<IDBValidKey> {
  return dbTransaction(STORE_IMAGES, "readwrite", (s) => s.put(image));
}

async function hashDataUrl(dataUrl: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < dataUrl.length; i++) {
      const code = dataUrl.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= code;
      h2 = Math.imul(h2, 0x27d4eb2d);
    }
    return `fallback-${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
  }
  const data = new TextEncoder().encode(dataUrl);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadImageEl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = dataUrl;
  });
}

async function createThumbnailDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const image = await loadImageEl(dataUrl);
    const scale = Math.min(
      1,
      THUMBNAIL_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", THUMBNAIL_QUALITY);
  } catch {
    return null;
  }
}

export async function storeImage(
  dataUrl: string,
  source = "upload",
): Promise<string> {
  const id = await hashDataUrl(dataUrl);
  const existing = await getImage(id);
  if (!existing) {
    await putImage({ id, dataUrl, createdAt: Date.now(), source });
  }
  return id;
}

// ===== Slicer History =====

export function getAllSlicerHistory(): Promise<SlicerHistoryEntry[]> {
  return dbTransaction(STORE_SLICER_HISTORY, "readonly", (s) => s.getAll());
}

export function putSlicerHistoryEntry(
  entry: SlicerHistoryEntry,
): Promise<IDBValidKey> {
  return dbTransaction(STORE_SLICER_HISTORY, "readwrite", (s) => s.put(entry));
}

export function deleteSlicerHistoryEntry(id: string): Promise<undefined> {
  return dbTransaction(STORE_SLICER_HISTORY, "readwrite", (s) => s.delete(id));
}

// suppress unused warning — thumbnail version used by slicerHistory
void THUMBNAIL_VERSION;
void createThumbnailDataUrl;
