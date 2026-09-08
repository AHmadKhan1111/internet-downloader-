import JSZip from "jszip";
import { BypassConfig } from "../types";
import { sanitizeFilename } from "./formatters";

export function buildProxyDownloadUrl(
  url: string,
  filename?: string,
  bypassConfig?: Partial<BypassConfig>
): string {
  const params = new URLSearchParams();
  params.set("url", url);
  if (filename) {
    params.set("filename", sanitizeFilename(filename));
  }
  if (bypassConfig?.userAgent) {
    params.set("userAgent", bypassConfig.userAgent);
  }
  if (bypassConfig?.refererMode === "custom" && bypassConfig.customReferer) {
    params.set("referer", bypassConfig.customReferer);
  } else if (bypassConfig?.refererMode === "none") {
    params.set("referer", "");
  }
  return `/api/download?${params.toString()}`;
}

export function triggerDirectDownload(url: string, filename?: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (filename) {
    anchor.download = sanitizeFilename(filename);
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
  }, 200);
}

export interface ProgressCallbackData {
  downloadedBytes: number;
  totalBytes: number | null;
  progress: number; // 0 - 100
  speedBytesPerSec: number;
}

export async function downloadWithProgress(
  url: string,
  filename: string,
  bypassConfig: BypassConfig,
  onProgress: (data: ProgressCallbackData) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const proxyUrl = buildProxyDownloadUrl(url, filename, bypassConfig);

  const response = await fetch(proxyUrl, { signal });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.details || "";
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`Download failed (${response.status}): ${errorDetail || "Unknown server error"}`);
  }

  const contentLengthHeader = response.headers.get("Content-Length");
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

  if (!response.body) {
    const blob = await response.blob();
    onProgress({
      downloadedBytes: blob.size,
      totalBytes: blob.size,
      progress: 100,
      speedBytesPerSec: 0,
    });
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;
  let lastSpeedSampleTime = performance.now();
  let bytesSinceLastSample = 0;
  let currentSpeed = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      downloadedBytes += value.byteLength;
      bytesSinceLastSample += value.byteLength;

      const now = performance.now();
      const elapsed = (now - lastSpeedSampleTime) / 1000;
      if (elapsed >= 0.5) {
        currentSpeed = bytesSinceLastSample / elapsed;
        lastSpeedSampleTime = now;
        bytesSinceLastSample = 0;
      }

      const progress = totalBytes && totalBytes > 0
        ? Math.min(100, (downloadedBytes / totalBytes) * 100)
        : 0;

      onProgress({
        downloadedBytes,
        totalBytes,
        progress,
        speedBytesPerSec: currentSpeed,
      });
    }
  }

  const mimeType = response.headers.get("Content-Type") || "application/octet-stream";
  const blob = new Blob(chunks, { type: mimeType });

  onProgress({
    downloadedBytes,
    totalBytes: totalBytes || downloadedBytes,
    progress: 100,
    speedBytesPerSec: 0,
  });

  // Trigger download prompt to user file system
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 1000);

  return blob;
}

export async function downloadBatchAsZip(
  items: Array<{ url: string; filename: string }>,
  zipName: string,
  bypassConfig: BypassConfig,
  onProgress: (overallProgress: number, currentItemIndex: number, currentItemName: string) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 90), i + 1, item.filename);

    try {
      const proxyUrl = buildProxyDownloadUrl(item.url, item.filename, bypassConfig);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        zip.file(sanitizeFilename(item.filename), arrayBuf);
      }
    } catch (err) {
      console.warn(`Failed to fetch ${item.filename} into zip:`, err);
    }
  }

  onProgress(95, items.length, "Generating ZIP package...");
  const content = await zip.generateAsync({ type: "blob" });

  onProgress(100, items.length, "Ready");
  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = sanitizeFilename(zipName.endsWith(".zip") ? zipName : `${zipName}.zip`);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}
