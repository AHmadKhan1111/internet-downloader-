import React, { useState, useMemo } from "react";
import {
  DiscoveredAsset,
  BypassConfig,
} from "../types";
import {
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Archive,
  File,
  Download,
  Package,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";
import { downloadBatchAsZip } from "../utils/downloader";

interface DiscoveredAssetsListProps {
  assets: DiscoveredAsset[];
  sourceUrl: string;
  bypassConfig: BypassConfig;
  onDownloadItem: (url: string, filename: string) => void;
  onBatchDownload: (items: Array<{ url: string; filename: string }>) => void;
}

export const DiscoveredAssetsList: React.FC<DiscoveredAssetsListProps> = ({
  assets,
  sourceUrl,
  bypassConfig,
  onDownloadItem,
  onBatchDownload,
}) => {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ progress: 0, current: "" });

  const filteredAssets = useMemo(() => {
    if (filterType === "all") return assets;
    return assets.filter((a) => a.type === filterType);
  }, [assets, filterType]);

  const toggleSelect = (url: string) => {
    const next = new Set(selectedUrls);
    if (next.has(url)) {
      next.delete(url);
    } else {
      next.add(url);
    }
    setSelectedUrls(next);
  };

  const handleSelectAll = () => {
    if (selectedUrls.size === filteredAssets.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredAssets.map((a) => a.url)));
    }
  };

  const handleDownloadSelected = () => {
    const selectedItems = assets
      .filter((a) => selectedUrls.has(a.url))
      .map((a) => ({ url: a.url, filename: a.title + a.extension }));
    if (selectedItems.length > 0) {
      onBatchDownload(selectedItems);
    }
  };

  const handleZipDownload = async () => {
    const targetItems = selectedUrls.size > 0
      ? assets.filter((a) => selectedUrls.has(a.url))
      : filteredAssets;

    if (targetItems.length === 0) return;

    setIsZipping(true);
    try {
      const itemsToZip = targetItems.map((a) => ({
        url: a.url,
        filename: a.title.endsWith(a.extension) ? a.title : `${a.title}${a.extension}`,
      }));

      const urlObj = new URL(sourceUrl);
      const zipName = `${urlObj.hostname.replace(/[^a-zA-Z0-9]/g, "_")}_media_bundle.zip`;

      await downloadBatchAsZip(
        itemsToZip,
        zipName,
        bypassConfig,
        (progress, currentIdx, currentName) => {
          setZipProgress({
            progress,
            current: `Archiving [${currentIdx}/${itemsToZip.length}]: ${currentName}`,
          });
        }
      );
    } catch (err) {
      console.error("ZIP bundling error:", err);
    } finally {
      setIsZipping(false);
      setZipProgress({ progress: 0, current: "" });
    }
  };

  const getAssetIcon = (type: DiscoveredAsset["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-rose-400" />;
      case "audio":
        return <Music className="h-4 w-4 text-emerald-400" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-sky-400" />;
      case "document":
        return <FileText className="h-4 w-4 text-amber-400" />;
      case "archive":
        return <Archive className="h-4 w-4 text-purple-400" />;
      default:
        return <File className="h-4 w-4 text-neutral-400" />;
    }
  };

  if (!assets || assets.length === 0) return null;

  return (
    <div
      id="discovered-assets-container"
      className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm"
    >
      {/* Header & Batch Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Extracted Media & Downloadable Files</span>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300 font-semibold">
              {assets.length} Found
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Detected from the webpage. Select individual files or batch download.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-select-all-assets"
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            {selectedUrls.size === filteredAssets.length && filteredAssets.length > 0 ? (
              <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Square className="h-3.5 w-3.5 text-neutral-400" />
            )}
            <span>{selectedUrls.size === filteredAssets.length ? "Deselect" : "Select All"}</span>
          </button>

          {selectedUrls.size > 0 && (
            <button
              id="btn-download-selected-assets"
              onClick={handleDownloadSelected}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Selected ({selectedUrls.size})</span>
            </button>
          )}

          <button
            id="btn-download-all-zip"
            disabled={isZipping}
            onClick={handleZipDownload}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
            title="Packs all or selected assets into a single zip archive"
          >
            <Package className="h-3.5 w-3.5 text-indigo-400" />
            <span>{isZipping ? "Creating ZIP..." : "Download as ZIP"}</span>
          </button>
        </div>
      </div>

      {/* ZIP Progress notice */}
      {isZipping && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-indigo-200 font-medium">
            <span>{zipProgress.current}</span>
            <span>{zipProgress.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${zipProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 text-neutral-500 mr-1" />
        {["all", "video", "audio", "image", "document", "archive"].map((cat) => {
          const count = cat === "all" ? assets.length : assets.filter((a) => a.type === cat).length;
          if (count === 0 && cat !== "all") return null;

          return (
            <button
              key={cat}
              id={`filter-asset-${cat}`}
              onClick={() => setFilterType(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                filterType === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Assets Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredAssets.map((asset, index) => {
          const isChecked = selectedUrls.has(asset.url);
          const filename = asset.title.endsWith(asset.extension)
            ? asset.title
            : `${asset.title}${asset.extension}`;

          return (
            <div
              key={index}
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                isChecked
                  ? "border-indigo-500/60 bg-indigo-950/20"
                  : "border-neutral-800/80 bg-neutral-950/40 hover:border-neutral-700 hover:bg-neutral-950/80"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSelect(asset.url)}
                  className="p-0.5 text-neutral-400 hover:text-white shrink-0"
                >
                  {isChecked ? (
                    <CheckSquare className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Square className="h-4 w-4 text-neutral-500" />
                  )}
                </button>

                <div className="p-1.5 rounded-lg bg-neutral-900 shrink-0">
                  {getAssetIcon(asset.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-200 truncate">
                      {asset.title}
                    </span>
                    <span className="rounded bg-neutral-800 px-1 py-0.2 text-[10px] font-mono text-neutral-400 shrink-0 uppercase">
                      {asset.extension.replace(".", "") || asset.type}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400 truncate">
                    {asset.url}
                  </p>
                </div>
              </div>

              <button
                id={`btn-download-asset-${index}`}
                onClick={() => onDownloadItem(asset.url, filename)}
                className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                title={`Download ${filename}`}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
