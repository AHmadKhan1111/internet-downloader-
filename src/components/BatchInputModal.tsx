import React, { useState } from "react";
import { X, Layers, Download, Check, AlertCircle, FileText } from "lucide-react";

interface BatchInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBatch: (urls: string[]) => void;
}

export const BatchInputModal: React.FC<BatchInputModalProps> = ({
  isOpen,
  onClose,
  onStartBatch,
}) => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleProcess = () => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http://") || l.startsWith("https://"));

    if (lines.length === 0) {
      setError("Please enter at least one valid http:// or https:// URL.");
      return;
    }

    onStartBatch(lines);
    setText("");
    setError("");
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText((prev) => (prev ? `${prev}\n${content}` : content));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        id="modal-batch-input"
        className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Batch Link Downloader</h3>
              <p className="text-xs text-neutral-400">
                Paste multiple links (one per line) or import a text list
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <textarea
            id="textarea-batch-urls"
            rows={7}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://example.com/file1.mp4&#10;https://example.com/document.pdf&#10;https://example.com/photo.jpg"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs sm:text-sm font-mono text-neutral-100 placeholder-neutral-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
              <FileText className="h-3.5 w-3.5" />
              <span>Import URLs from .txt / .csv file</span>
              <input
                type="file"
                accept=".txt,.csv,.log"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <span className="text-xs text-neutral-500">
              {
                text
                  .split("\n")
                  .filter((l) => l.trim().startsWith("http://") || l.trim().startsWith("https://"))
                  .length
              }{" "}
              valid URLs detected
            </span>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-batch-download"
            onClick={handleProcess}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
          >
            <Download className="h-4 w-4" />
            <span>Add to Download Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
