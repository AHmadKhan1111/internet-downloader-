import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  HardDrive,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
} from "lucide-react";
import { ProbeResult, BypassConfig } from "../types";
import { formatBytes } from "../utils/formatters";
import { buildProxyDownloadUrl, triggerDirectDownload } from "../utils/downloader";

interface ProbeCardProps {
  probeResult: ProbeResult;
  bypassConfig: BypassConfig;
  onStartDownload: (url: string, filename: string) => void;
  onScrollToAssets?: () => void;
}

export const ProbeCard: React.FC<ProbeCardProps> = ({
  probeResult,
  bypassConfig,
  onStartDownload,
  onScrollToAssets,
}) => {
  const [customFilename, setCustomFilename] = useState(probeResult.filename);
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setCustomFilename(probeResult.filename);
  }, [probeResult.filename]);

  const proxyDownloadUrl = buildProxyDownloadUrl(
    probeResult.finalUrl || probeResult.targetUrl,
    customFilename,
    bypassConfig
  );

  const handleCopyProxy = async () => {
    try {
      const fullUrl = new URL(proxyDownloadUrl, window.location.origin).href;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedProxy(true);
      setTimeout(() => setCopiedProxy(false), 2000);
    } catch {
      // ignore
    }
  };

  const hasDiscoveredAssets =
    probeResult.discoveredAssets && probeResult.discoveredAssets.length > 0;

  return (
    <div
      id="probe-result-card"
      className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6 shadow-xl backdrop-blur-sm"
    >
      {/* Top Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              probeResult.ok
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
            }`}
          >
            {probeResult.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Status: {probeResult.status || "200 OK"}
          </span>

          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
            {probeResult.contentType.split(";")[0]}
          </span>

          {probeResult.acceptRanges && (
            <span className="hidden sm:inline-flex rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20">
              Resumable (Byte Ranges)
            </span>
          )}
        </div>

        {hasDiscoveredAssets && (
          <button
            id="btn-jump-to-assets"
            onClick={onScrollToAssets}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{probeResult.discoveredAssets?.length} Media Assets Extracted</span>
          </button>
        )}
      </div>

      {/* Main File Details Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5">
        {/* Left 2 Cols: File Info & Filename Edit */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Filename (Click to customize)
            </label>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    id="input-custom-filename"
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                    className="w-full rounded-lg border border-indigo-500/80 bg-neutral-950 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingName(true)}
                  className="group flex flex-1 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5 cursor-pointer hover:border-neutral-700 hover:bg-neutral-950 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="font-mono text-sm text-neutral-100 truncate">
                      {customFilename}
                    </span>
                  </div>
                  <Edit3 className="h-3.5 w-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </div>
              )}
            </div>
          </div>

          {/* Target and Resolved URL Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Source URL
            </span>
            <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-2.5 text-xs font-mono text-neutral-400 break-all">
              {probeResult.finalUrl || probeResult.targetUrl}
            </div>
          </div>
        </div>

        {/* Right Col: Metric Box */}
        <div className="flex flex-col justify-center rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <HardDrive className="h-4 w-4 text-indigo-400" />
            <span>Estimated Size:</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatBytes(probeResult.contentLength)}
          </div>
          <div className="text-xs text-neutral-400 flex items-center gap-1.5 pt-1 border-t border-neutral-800/60">
            <FileCode className="h-3.5 w-3.5 text-emerald-400" />
            <span>MIME: {probeResult.contentType.split(";")[0]}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-800/80">
        <button
          id="btn-start-proxy-download"
          onClick={() =>
            onStartDownload(
              probeResult.finalUrl || probeResult.targetUrl,
              customFilename
            )
          }
          className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download (Unrestricted Stream)</span>
        </button>

        <button
          id="btn-direct-browser-download"
          onClick={() =>
            triggerDirectDownload(
              proxyDownloadUrl,
              customFilename
            )
          }
          className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
          title="Triggers instant browser save file prompt directly"
        >
          <ExternalLink className="h-4 w-4 text-neutral-400" />
          <span>Direct Save Prompt</span>
        </button>

        <button
          id="btn-copy-proxy-link"
          onClick={handleCopyProxy}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-3 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Copy the proxy download link for cURL or external download managers"
        >
          {copiedProxy ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-neutral-400" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
