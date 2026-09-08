import React from "react";
import { X, History, Trash2, Download, ExternalLink, Calendar, HardDrive } from "lucide-react";
import { formatBytes } from "../utils/formatters";

export interface HistoryItem {
  id: string;
  url: string;
  filename: string;
  size?: number | null;
  date: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onRedownload: (url: string, filename: string) => void;
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onRedownload,
  onClearHistory,
  onRemoveItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        id="modal-download-history"
        className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Download History</h3>
              <p className="text-xs text-neutral-400">
                {items.length} previously downloaded {items.length === 1 ? "file" : "files"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                id="btn-clear-all-history"
                onClick={onClearHistory}
                className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs">
            No downloads recorded yet. Start downloading any file to keep track of your history!
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-neutral-100 truncate">
                      {item.filename}
                    </span>
                    {item.size && (
                      <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                        ({formatBytes(item.size)})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                    {item.url}
                  </p>
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.date).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onRedownload(item.url, item.filename)}
                    className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-indigo-500 hover:text-indigo-400"
                    title="Download again"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-rose-400"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
