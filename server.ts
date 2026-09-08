import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to determine file extension from MIME type
function getExtensionFromMime(mime: string): string {
  const cleanMime = mime.split(";")[0].trim().toLowerCase();
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-matroska": ".mkv",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/flac": ".flac",
    "audio/aac": ".aac",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/x-rar-compressed": ".rar",
    "application/x-7z-compressed": ".7z",
    "application/x-tar": ".tar",
    "application/gzip": ".tar.gz",
    "application/json": ".json",
    "text/plain": ".txt",
    "text/html": ".html",
    "text/csv": ".csv",
    "application/vnd.android.package-archive": ".apk",
    "application/octet-stream": ".bin",
  };
  return mimeMap[cleanMime] || "";
}

// Helper to extract filename from Content-Disposition header or URL
function extractFilename(contentDisposition: string | null, targetUrl: string, mime: string): string {
  let filename = "";

  if (contentDisposition) {
    // Check filename*=UTF-8''...
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utf8Match && utf8Match[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1].trim());
      } catch {
        filename = utf8Match[1].trim();
      }
    } else {
      // Check standard filename="..." or filename=...
      const match = contentDisposition.match(/filename=["']?([^"';\r\n]+)["']?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }
  }

  if (!filename) {
    try {
      const parsedUrl = new URL(targetUrl);
      const pathname = parsedUrl.pathname;
      const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
      if (lastSegment && lastSegment.length > 0 && !lastSegment.includes("?") && !lastSegment.includes("&")) {
        try {
          filename = decodeURIComponent(lastSegment);
        } catch {
          filename = lastSegment;
        }
      }
    } catch {
      // ignore
    }
  }

  // If still no filename or no extension, construct one
  if (!filename || filename === "/" || filename === "") {
    const ext = getExtensionFromMime(mime) || ".bin";
    filename = `download_${Date.now()}${ext}`;
  } else if (!path.extname(filename)) {
    const ext = getExtensionFromMime(mime);
    if (ext) {
      filename += ext;
    }
  }

  // Clean filename of unsafe characters
  filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
  return filename || `download_${Date.now()}.bin`;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Probe endpoint: fetches headers, MIME, size, filename, and inspects web pages for media
app.get("/api/probe", async (req, res) => {
  const targetUrl = req.query.url as string;
  const customUserAgent = (req.query.userAgent as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const customReferer = req.query.referer as string;

  if (!targetUrl) {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http:// and https:// URLs are supported." });
      return;
    }

    const headers: Record<string, string> = {
      "User-Agent": customUserAgent,
      "Accept": "*/*",
      "Accept-Encoding": "identity",
    };

    if (customReferer) {
      headers["Referer"] = customReferer;
    } else {
      // By default, set referer to host origin to satisfy hotlink protections
      headers["Referer"] = `${parsed.protocol}//${parsed.host}/`;
    }

    // Try HEAD first
    let response: Response;
    let finalUrl = targetUrl;

    try {
      response = await fetch(targetUrl, {
        method: "HEAD",
        headers,
        redirect: "follow",
      });
      finalUrl = response.url || targetUrl;

      // Some servers return 405 Method Not Allowed or 403 Forbidden on HEAD
      if (!response.ok && (response.status === 405 || response.status === 403 || response.status === 400)) {
        // Fallback to GET with small byte range
        response = await fetch(targetUrl, {
          method: "GET",
          headers: { ...headers, "Range": "bytes=0-2048" },
          redirect: "follow",
        });
        finalUrl = response.url || targetUrl;
      }
    } catch {
      // Try GET if HEAD threw network error
      response = await fetch(targetUrl, {
        method: "GET",
        headers: { ...headers, "Range": "bytes=0-2048" },
        redirect: "follow",
      });
      finalUrl = response.url || targetUrl;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");
    const acceptRanges = response.headers.get("accept-ranges") === "bytes" || !!response.headers.get("content-range");
    
    // Parse content length (handling Content-Range if ranged GET was used)
    let contentLength: number | null = null;
    const rawContentLength = response.headers.get("content-length");
    const rawContentRange = response.headers.get("content-range");

    if (rawContentRange) {
      const match = rawContentRange.match(/\/(\d+)/);
      if (match && match[1]) {
        contentLength = parseInt(match[1], 10);
      }
    } else if (rawContentLength) {
      contentLength = parseInt(rawContentLength, 10);
    }

    const filename = extractFilename(contentDisposition, finalUrl, contentType);

    // If response is HTML, we can parse it to discover downloadable assets
    const isHtml = contentType.toLowerCase().includes("text/html");
    const discoveredAssets: Array<{
      url: string;
      type: "video" | "audio" | "image" | "document" | "archive" | "other";
      title: string;
      extension: string;
    }> = [];

    if (isHtml) {
      try {
        // Fetch up to 1MB of HTML
        const htmlResp = await fetch(finalUrl, {
          method: "GET",
          headers: {
            "User-Agent": customUserAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": `${parsed.protocol}//${parsed.host}/`,
          },
          redirect: "follow",
        });

        if (htmlResp.ok) {
          const htmlText = await htmlResp.text();
          const baseUrl = htmlResp.url || finalUrl;

          // Helper to resolve URL
          const resolveUrl = (rel: string): string | null => {
            if (!rel || rel.startsWith("data:") || rel.startsWith("javascript:") || rel.startsWith("#")) return null;
            try {
              return new URL(rel, baseUrl).href;
            } catch {
              return null;
            }
          };

          // Find video sources
          const videoRegex = /<video[^>]*src=["']([^"']+)["'][^>]*>|<source[^>]*src=["']([^"']+)["'][^>]*type=["']video\/[^"']+["']|<source[^>]*type=["']video\/[^"']+["'][^>]*src=["']([^"']+)["']/gi;
          let match;
          while ((match = videoRegex.exec(htmlText)) !== null) {
            const rawSrc = match[1] || match[2] || match[3];
            const resolved = resolveUrl(rawSrc);
            if (resolved && !discoveredAssets.some(a => a.url === resolved)) {
              const ext = path.extname(new URL(resolved).pathname) || ".mp4";
              discoveredAssets.push({
                url: resolved,
                type: "video",
                title: path.basename(new URL(resolved).pathname) || `Video Stream`,
                extension: ext,
              });
            }
          }

          // Find audio sources
          const audioRegex = /<audio[^>]*src=["']([^"']+)["'][^>]*>|<source[^>]*src=["']([^"']+)["'][^>]*type=["']audio\/[^"']+["']|<source[^>]*type=["']audio\/[^"']+["'][^>]*src=["']([^"']+)["']/gi;
          while ((match = audioRegex.exec(htmlText)) !== null) {
            const rawSrc = match[1] || match[2] || match[3];
            const resolved = resolveUrl(rawSrc);
            if (resolved && !discoveredAssets.some(a => a.url === resolved)) {
              const ext = path.extname(new URL(resolved).pathname) || ".mp3";
              discoveredAssets.push({
                url: resolved,
                type: "audio",
                title: path.basename(new URL(resolved).pathname) || `Audio Track`,
                extension: ext,
              });
            }
          }

          // Find downloadable files in <a> links (mp4, zip, pdf, apk, mkv, mp3, etc.)
          const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
          const mediaExtensions = [
            ".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv",
            ".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac",
            ".pdf", ".epub", ".mobi", ".docx", ".xlsx", ".pptx",
            ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
            ".apk", ".exe", ".msi", ".dmg", ".pkg", ".iso", ".bin",
            ".csv", ".json", ".xml", ".sql"
          ];

          while ((match = linkRegex.exec(htmlText)) !== null) {
            const href = match[1];
            const innerText = match[2].replace(/<[^>]+>/g, "").trim();
            const resolved = resolveUrl(href);
            if (resolved && !discoveredAssets.some(a => a.url === resolved)) {
              try {
                const u = new URL(resolved);
                const ext = path.extname(u.pathname).toLowerCase();
                if (mediaExtensions.includes(ext)) {
                  let type: "video" | "audio" | "document" | "archive" | "other" = "other";
                  if ([".mp4", ".mkv", ".webm", ".avi", ".mov"].includes(ext)) type = "video";
                  else if ([".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"].includes(ext)) type = "audio";
                  else if ([".pdf", ".epub", ".docx", ".xlsx", ".pptx"].includes(ext)) type = "document";
                  else if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) type = "archive";

                  discoveredAssets.push({
                    url: resolved,
                    type,
                    title: innerText || path.basename(u.pathname) || `File ${ext}`,
                    extension: ext,
                  });
                }
              } catch {
                // ignore
              }
            }
            if (discoveredAssets.length >= 50) break;
          }

          // Find prominent images (e.g. og:image or large images)
          const ogImageMatch = htmlText.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                               htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            const resolved = resolveUrl(ogImageMatch[1]);
            if (resolved && !discoveredAssets.some(a => a.url === resolved)) {
              discoveredAssets.push({
                url: resolved,
                type: "image",
                title: "Featured Open Graph Image",
                extension: path.extname(new URL(resolved).pathname) || ".jpg",
              });
            }
          }

          // Top img tags
          const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
          let imgCount = 0;
          while ((match = imgRegex.exec(htmlText)) !== null && imgCount < 15) {
            const rawSrc = match[1];
            const resolved = resolveUrl(rawSrc);
            if (resolved && !discoveredAssets.some(a => a.url === resolved)) {
              const ext = path.extname(new URL(resolved).pathname).toLowerCase() || ".png";
              if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
                discoveredAssets.push({
                  url: resolved,
                  type: "image",
                  title: path.basename(new URL(resolved).pathname) || `Image ${imgCount + 1}`,
                  extension: ext,
                });
                imgCount++;
              }
            }
          }
        }
      } catch (err) {
        console.warn("HTML asset scanning error:", err);
      }
    }

    res.json({
      status: response.status,
      ok: response.ok,
      targetUrl,
      finalUrl,
      filename,
      contentType,
      contentLength,
      acceptRanges,
      isHtml,
      discoveredAssets: discoveredAssets.slice(0, 40),
    });
  } catch (error: any) {
    console.error("Probe error:", error);
    res.status(500).json({
      error: error.message || "Failed to inspect link",
      details: String(error),
    });
  }
});

// Proxy Download Streaming endpoint: streams file directly from target URL to client
app.get("/api/download", (req, res) => {
  const targetUrl = req.query.url as string;
  const userRequestedFilename = req.query.filename as string;
  const customUserAgent = (req.query.userAgent as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const customReferer = req.query.referer as string;

  if (!targetUrl) {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http:// and https:// URLs are supported." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL provided." });
    return;
  }

  const clientRange = req.headers["range"];

  const requestHeaders: Record<string, string> = {
    "User-Agent": customUserAgent,
    "Accept": "*/*",
    "Accept-Encoding": "identity",
  };

  if (customReferer) {
    requestHeaders["Referer"] = customReferer;
  } else {
    requestHeaders["Referer"] = `${parsed.protocol}//${parsed.host}/`;
  }

  if (clientRange) {
    requestHeaders["Range"] = clientRange;
  }

  const transport = parsed.protocol === "https:" ? https : http;

  // Make streaming request to target
  const makeRequest = (currentUrl: string, redirectCount = 0) => {
    if (redirectCount > 10) {
      res.status(502).json({ error: "Too many redirects from source host." });
      return;
    }

    let currentParsed: URL;
    try {
      currentParsed = new URL(currentUrl);
    } catch {
      res.status(400).json({ error: "Invalid redirect target." });
      return;
    }

    const currentTransport = currentParsed.protocol === "https:" ? https : http;

    const outgoingReq = currentTransport.request(
      currentUrl,
      {
        method: "GET",
        headers: {
          ...requestHeaders,
          Host: currentParsed.host,
        },
      },
      (upstreamRes) => {
        // Handle HTTP redirects (301, 302, 303, 307, 308)
        if (
          upstreamRes.statusCode &&
          upstreamRes.statusCode >= 300 &&
          upstreamRes.statusCode < 400 &&
          upstreamRes.headers.location
        ) {
          const nextLocation = new URL(upstreamRes.headers.location, currentUrl).href;
          outgoingReq.destroy();
          makeRequest(nextLocation, redirectCount + 1);
          return;
        }

        const statusCode = upstreamRes.statusCode || 200;
        const contentType = upstreamRes.headers["content-type"] || "application/octet-stream";
        const contentDisposition = upstreamRes.headers["content-disposition"] as string | undefined;

        // Determine filename
        let filename = userRequestedFilename;
        if (!filename) {
          filename = extractFilename(contentDisposition || null, currentUrl, contentType);
        }

        // Clean filename
        filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
        const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

        // Forward response status code
        res.status(statusCode);

        // Set attachment headers so browser initiates forced download without restriction
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
        );
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Range, Accept-Ranges");

        if (upstreamRes.headers["content-length"]) {
          res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
        }
        if (upstreamRes.headers["content-range"]) {
          res.setHeader("Content-Range", upstreamRes.headers["content-range"]);
        }
        if (upstreamRes.headers["accept-ranges"]) {
          res.setHeader("Accept-Ranges", upstreamRes.headers["accept-ranges"]);
        }

        // Stream data chunks straight to the browser
        upstreamRes.pipe(res);

        upstreamRes.on("error", (err) => {
          console.error("Upstream stream error:", err);
          if (!res.headersSent) {
            res.status(502).json({ error: "Error reading stream from source" });
          } else {
            res.end();
          }
        });

        res.on("close", () => {
          outgoingReq.destroy();
        });
      }
    );

    outgoingReq.on("error", (err) => {
      console.error("Outgoing proxy request error:", err);
      if (!res.headersSent) {
        res.status(502).json({ error: `Connection failed: ${err.message}` });
      } else {
        res.end();
      }
    });

    outgoingReq.end();
  };

  makeRequest(targetUrl);
});

async function startServer() {
  // Vite dev middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
