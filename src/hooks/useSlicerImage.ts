import { useEffect, useState } from "react";
import { loadImage } from "../lib/canvasImage";

interface SlicerImageProps {
  imageId: string | null;
  splitImageDataUrl: string | null;
  setSplitImageDataUrl: (url: string | null) => void;
  setSplitImageId: (id: string | null) => void;
  showToast: (msg: string, type?: string) => void;
}

export function useSlicerImage({
  imageId,
  splitImageDataUrl,
  setSplitImageDataUrl,
  setSplitImageId,
  showToast,
}: SlicerImageProps) {
  const [src, setSrc] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc("");
    setImage(null);

    const load = async () => {
      const dataUrl = splitImageDataUrl ?? null;
      if (!dataUrl && !imageId) return;
      const urlToLoad = dataUrl ?? splitImageDataUrl;
      if (!urlToLoad) return;
      const loaded = await loadImage(urlToLoad);
      if (cancelled) return;
      setSrc(urlToLoad);
      setImage(loaded);
    };

    load().catch((err) => {
      if (cancelled) return;
      console.error(err);
      showToast(err instanceof Error ? err.message : "图片加载失败", "error");
      setSplitImageId(null);
      setSplitImageDataUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [
    imageId,
    splitImageDataUrl,
    setSplitImageDataUrl,
    setSplitImageId,
    showToast,
  ]);

  return { src, image, setSplitImageDataUrl };
}
