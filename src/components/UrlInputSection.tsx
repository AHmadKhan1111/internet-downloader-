import React, { useState } from "react";
import { Search, Download, Clipboard, X, Sparkles, Layers, ArrowRight } from "lucide-react";
import { PRESET_LINKS } from "../utils/formatters";
import { PresetLink } from "../types";

interface UrlInputSectionProps {
  url: string;
  setUrl: (url: string) => void;
  onProbe: (targetUrl: string) => void;
  onInstantDownload: (targetUrl: string) => void;
  isProbing: boolean;
  onOpenBatch: () => void;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  url,
  setUrl,
  onProbe,
  onInstantDownload,
  isProbing,
  onOpenBatch,
}) => {
  const [pasteError, setPasteError] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setPasteError(false);
      }
    } catch {
      setPasteError(true);
      setTimeout(() => setPasteError(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onProbe(url.trim());
    }
  };

  const handlePresetSelect = (preset: PresetLink) => {
    setUrl(preset.url);
    onProbe(preset.url);
  };

  return (
    <section id="url-input-section" className="w-full space-y-4">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Download Any File Without Restriction
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Paste any link — video, audio, image, PDF, zip, raw stream, or webpage with media.
          </p>
        </div>

        <button
          id="btn-switch-batch-mode"
          onClick={onOpenBatch}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <Layers className="h-3.5 w-3.5 text-indigo-400" />
          <span>Batch Downloader</span>
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="group relative flex flex-col sm:flex-row items-stretch rounded-2xl border border-neutral-800 bg-neutral-900/90 p-2 shadow-2xl transition-all focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <div className="relative flex flex-1 items-center px-2">
            <Search className="h-5 w-5 text-neutral-500 shrink-0 mr-2.5" />
            <input
              id="input-target-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any URL (e.g., https://example.com/video.mp4 or article page)..."
              required
              className="w-full bg-transparent py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
            {url && (
              <button
                id="btn-clear-url"
                type="button"
                onClick={() => setUrl("")}
                className="p-1 text-neutral-400 hover:text-white"
                title="Clear URL"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              id="btn-paste-clipboard"
              type="button"
              onClick={handlePaste}
              className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              title="Paste from clipboard"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Paste</span>
            </button>
          </div>

          <div className="mt-2 sm:mt-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
            <button
              id="btn-probe-url"
              type="submit"
              disabled={isProbing || !url.trim()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-200 transition-all hover:bg-neutral-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProbing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-indigo-400" />
              )}
              <span>{isProbing ? "Analyzing..." : "Inspect Link"}</span>
            </button>

            <button
              id="btn-instant-download"
              type="button"
              disabled={!url.trim() || isProbing}
              onClick={() => onInstantDownload(url.trim())}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Instant Download</span>
            </button>
          </div>
        </div>

        {pasteError && (
          <p className="mt-1.5 text-xs text-rose-400">
            Clipboard permission denied. Please press Ctrl+V / Cmd+V directly.
          </p>
        )}
      </form>

      {/* Preset Links for Instant Testing */}
      <div id="preset-links-container" className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Quick Test Samples:
          </span>
          <span className="text-[11px] text-neutral-400">
            (Click to load & analyze immediately)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_LINKS.map((preset, index) => (
            <button
              key={index}
              id={`btn-preset-${preset.category.toLowerCase()}-${index}`}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className="group flex items-center gap-1.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-300 transition-all hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
              title={preset.description}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
              <span className="font-medium">{preset.label}</span>
              <ArrowRight className="h-3 w-3 text-neutral-400 group-hover:text-neutral-300 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
