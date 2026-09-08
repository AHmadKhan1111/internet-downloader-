export function formatBytes(bytes: number | null | undefined, decimals = 2): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return "Unknown size";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 B/s";
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/^\.+/, "")
    .trim() || `download_${Date.now()}.bin`;
}

export const USER_AGENT_PRESETS = [
  {
    name: "Modern Chrome (Desktop)",
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "Safari (macOS)",
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  },
  {
    name: "iPhone (iOS 17 Safari)",
    value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  },
  {
    name: "cURL / CLI Agent",
    value: "curl/8.4.0",
  },
  {
    name: "Wget Downloader",
    value: "Wget/1.21.4",
  },
];

export const PRESET_LINKS: import("../types").PresetLink[] = [
  {
    label: "Sample MP4 Video",
    category: "Media",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    description: "Full HD open-source animated short film (MP4)",
    expectedType: "video/mp4",
  },
  {
    label: "Sample MP3 Audio",
    category: "Media",
    url: "https://actions.google.com/sounds/v1/water/rain_heavy.ogg",
    description: "High-fidelity audio soundscape (OGG/MP3)",
    expectedType: "audio/ogg",
  },
  {
    label: "Sample PDF Document",
    category: "Document",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Standard W3C test PDF specification document",
    expectedType: "application/pdf",
  },
  {
    label: "High-Res Photography (JPEG)",
    category: "Media",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop",
    description: "Ultra-wide vibrant abstract wallpaper image",
    expectedType: "image/jpeg",
  },
  {
    label: "Sample ZIP Archive",
    category: "Archive",
    url: "https://github.com/octocat/Hello-World/archive/refs/heads/master.zip",
    description: "GitHub repository master branch zip package",
    expectedType: "application/zip",
  },
  {
    label: "Webpage with Media",
    category: "Webpage",
    url: "https://en.wikipedia.org/wiki/Aurora",
    description: "Extract high-res Aurora Borealis photos & media from Wikipedia",
    expectedType: "text/html",
  },
];
