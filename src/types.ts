export interface SlicerHistoryEntry {
  id: string;
  imageId: string;
  thumb: string;
  timestamp: number;
  cols: number;
  rows: number;
  vLines: number[];
  hLines: number[];
}
