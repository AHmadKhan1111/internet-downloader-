import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { UrlInputSection } from "./components/UrlInputSection";
import { ProbeCard } from "./components/ProbeCard";
import { DiscoveredAssetsList } from "./components/DiscoveredAssetsList";
import { DownloadQueue } from "./components/DownloadQueue";
import { BypassSettingsModal } from "./components/BypassSettingsModal";
import { HistoryModal, HistoryItem } from "./components/HistoryModal";
import { BatchInputModal } from "./components/BatchInputModal";
import { ProbeResult, DownloadTask, BypassConfig } from "./types";
import { USER_AGENT_PRESETS, sanitizeFilename } from "./utils/formatters";
import { downloadWithProgress, triggerDirectDownload, buildProxyDownloadUrl } from "./utils/downloader";
import { Shield, Zap, Globe, Layers, CheckCircle2, AlertCircle } from "lucide-react";

export default function App() {
  const [url, setUrl] = useState("");
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Bypass options
  const [bypassConfig, setBypassConfig] = useState<BypassConfig>({
    userAgent: USER_AGENT_PRESETS[0].value,
    refererMode: "origin",
    customReferer: "",
  });

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const assetsSectionRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("downloader_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((h) => h.url !== item.url)].slice(0, 50);
      try {
        localStorage.setItem("downloader_history", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleProbe = async (targetUrl: string) => {
    if (!targetUrl) return;
    setIsProbing(true);
    setProbeError(null);

    try {
      const params = new URLSearchParams();
      params.set("url", targetUrl);
      if (bypassConfig.userAgent) params.set("userAgent", bypassConfig.userAgent);
      if (bypassConfig.refererMode === "custom" && bypassConfig.customReferer) {
        params.set("referer", bypassConfig.customReferer);
      } else if (bypassConfig.refererMode === "none") {
        params.set("referer", "");
      }

      const res = await fetch(`/api/probe?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data: ProbeResult = await res.json();
      setProbeResult(data);
    } catch (err: any) {
      console.error("Probe error:", err);
      setProbeError(err.message || "Failed to inspect the link.");
      setProbeResult(null);
    } finally {
      setIsProbing(false);
    }
  };

  const startDownloadTask = async (
    targetUrl: string,
    requestedFilename?: string,
    initialSize?: number | null
  ) => {
    const filename = sanitizeFilename(
      requestedFilename ||
        targetUrl.substring(targetUrl.lastIndexOf("/") + 1).split("?")[0] ||
        `download_${Date.now()}.bin`
    );

    const taskId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const controller = new AbortController();
    abortControllersRef.current.set(taskId, controller);

    const newTask: DownloadTask = {
      id: taskId,
      url: targetUrl,
      filename,
      totalBytes: initialSize || null,
      downloadedBytes: 0,
      progress: 0,
      speedBytesPerSec: 0,
      status: "downloading",
      startedAt: Date.now(),
      mode: "proxy-stream",
    };

    setTasks((prev) => [newTask, ...prev]);

    try {
      const blob = await downloadWithProgress(
        targetUrl,
        filename,
        bypassConfig,
        (progressData) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    downloadedBytes: progressData.downloadedBytes,
                    totalBytes: progressData.totalBytes || t.totalBytes,
                    progress: progressData.progress,
                    speedBytesPerSec: progressData.speedBytesPerSec,
                  }
                : t
            )
          );
        },
        controller.signal
      );

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: "completed",
                progress: 100,
                completedAt: Date.now(),
              }
            : t
        )
      );

      saveHistoryItem({
        id: taskId,
        url: targetUrl,
        filename,
        size: blob.size,
        date: new Date().toISOString(),
      });
    } catch (err: any) {
      if (controller.signal.aborted) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "cancelled", errorMessage: "Cancelled by user" } : t
          )
        );
      } else {
        console.error("Task download failed:", err);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "error",
                  errorMessage: err.message || "Download failed",
                }
              : t
          )
        );
      }
    } finally {
      abortControllersRef.current.delete(taskId);
    }
  };

  const handleInstantDownload = async (targetUrl: string) => {
    // If we haven't probed yet, trigger a fast download task right away
    startDownloadTask(targetUrl);
    // Also probe in background to enrich filename and metadata if needed
    if (!probeResult || probeResult.targetUrl !== targetUrl) {
      handleProbe(targetUrl);
    }
  };

  const handleCancelTask = (taskId: string) => {
    const controller = abortControllersRef.current.get(taskId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(taskId);
    }
  };

  const handleRetryTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      startDownloadTask(task.url, task.filename, task.totalBytes);
    }
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status === "downloading"));
  };

  const handleRemoveTask = (taskId: string) => {
    handleCancelTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleBatchDownload = (items: Array<{ url: string; filename: string }>) => {
    items.forEach((item, index) => {
      setTimeout(() => {
        startDownloadTask(item.url, item.filename);
      }, index * 300);
    });
  };

  const handleBatchUrls = (urls: string[]) => {
    urls.forEach((u, index) => {
      setTimeout(() => {
        startDownloadTask(u);
      }, index * 300);
    });
  };

  const activeCount = tasks.filter((t) => t.status === "downloading").length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 font-sans">
      <Navbar
        activeCount={activeCount}
        historyCount={history.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Main Input Hero Section */}
        <UrlInputSection
          url={url}
          setUrl={setUrl}
          onProbe={handleProbe}
          onInstantDownload={handleInstantDownload}
          isProbing={isProbing}
          onOpenBatch={() => setIsBatchOpen(true)}
        />

        {/* Error Notification */}
        {probeError && (
          <div
            id="probe-error-banner"
            className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-300 backdrop-blur-sm"
          >
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Unable to inspect link: </span>
              <span>{probeError}</span>
            </div>
            <button
              onClick={() => handleInstantDownload(url)}
              className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shrink-0"
            >
              Try Direct Force Stream
            </button>
          </div>
        )}

        {/* Probe Result Card */}
        {probeResult && (
          <ProbeCard
            probeResult={probeResult}
            bypassConfig={bypassConfig}
            onStartDownload={(downloadUrl, filename) =>
              startDownloadTask(downloadUrl, filename, probeResult.contentLength)
            }
            onScrollToAssets={() => {
              assetsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}

        {/* Discovered Media & Assets Section (for web pages) */}
        {probeResult?.discoveredAssets && probeResult.discoveredAssets.length > 0 && (
          <div ref={assetsSectionRef}>
            <DiscoveredAssetsList
              assets={probeResult.discoveredAssets}
              sourceUrl={probeResult.finalUrl || probeResult.targetUrl}
              bypassConfig={bypassConfig}
              onDownloadItem={(itemUrl, itemName) => startDownloadTask(itemUrl, itemName)}
              onBatchDownload={handleBatchDownload}
            />
          </div>
        )}

        {/* Active Download Queue */}
        <DownloadQueue
          tasks={tasks}
          onCancelTask={handleCancelTask}
          onRetryTask={handleRetryTask}
          onClearCompleted={handleClearCompleted}
          onRemoveTask={handleRemoveTask}
        />

        {/* Architecture & Capabilities Banner */}
        <section
          id="architecture-features-banner"
          className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-6 sm:p-7 backdrop-blur-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-indigo-400">
            <Shield className="h-5 w-5" />
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Unrestricted Download Engine Specifications
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                <Globe className="h-4 w-4 text-emerald-400" />
                <span>Zero CORS Block</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Streamed through a high-throughput backend proxy. No cross-origin browser rejections.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Hotlink Bypass</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Automatically spoofs target origin Referer headers so CDNs won't block downloads.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Forced Save As</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Enforces attachment disposition. Prevents PDFs and videos from opening in inline viewers.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                <Layers className="h-4 w-4 text-sky-400" />
                <span>Media Scraper</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Paste any article or webpage URL to detect and package embedded videos and audio into ZIP.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <BypassSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={bypassConfig}
        onChangeConfig={setBypassConfig}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={history}
        onRedownload={(hUrl, hName) => startDownloadTask(hUrl, hName)}
        onClearHistory={() => {
          setHistory([]);
          localStorage.removeItem("downloader_history");
        }}
        onRemoveItem={(id) => {
          const filtered = history.filter((h) => h.id !== id);
          setHistory(filtered);
          localStorage.setItem("downloader_history", JSON.stringify(filtered));
        }}
      />

      <BatchInputModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onStartBatch={handleBatchUrls}
      />
    </div>
  );
}
