export interface DiscoveredAsset {
  url: string;
  type: "video" | "audio" | "image" | "document" | "archive" | "other";
  title: string;
  extension: string;
}

export interface ProbeResult {
  status: number;
  ok: boolean;
  targetUrl: string;
  finalUrl: string;
  filename: string;
  contentType: string;
  contentLength: number | null;
  acceptRanges: boolean;
  isHtml: boolean;
  discoveredAssets?: DiscoveredAsset[];
  error?: string;
}

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  contentType?: string;
  totalBytes: number | null;
  downloadedBytes: number;
  progress: number; // 0 - 100
  speedBytesPerSec: number;
  status: "idle" | "probing" | "downloading" | "completed" | "error" | "cancelled";
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  blobUrl?: string;
  mode: "proxy-stream" | "client-fetch" | "direct-browser";
}

export interface PresetLink {
  label: string;
  category: "Media" | "Document" | "Archive" | "Webpage";
  url: string;
  description: string;
  expectedType: string;
}

export interface BypassConfig {
  userAgent: string;
  refererMode: "origin" | "custom" | "none";
  customReferer: string;
}
