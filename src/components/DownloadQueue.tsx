import React from "react";
import { DownloadTask } from "../types";
import {
  formatBytes,
  formatSpeed,
  formatDuration,
} from "../utils/formatters";
import {
  ArrowDownCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

interface DownloadQueueProps {
  tasks: DownloadTask[];
  onCancelTask: (id: string) => void;
  onRetryTask: (id: string) => void;
  onClearCompleted: () => void;
  onRemoveTask: (id: string) => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  tasks,
  onCancelTask,
  onRetryTask,
  onClearCompleted,
  onRemoveTask,
}) => {
  if (tasks.length === 0) return null;

  const hasCompleted = tasks.some(
    (t) => t.status === "completed" || t.status === "error" || t.status === "cancelled"
  );

  return (
    <section id="download-queue-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">
            Download Tasks ({tasks.length})
          </h3>
        </div>

        {hasCompleted && (
          <button
            id="btn-clear-completed-tasks"
            onClick={onClearCompleted}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const isDownloading = task.status === "downloading";
          const isCompleted = task.status === "completed";
          const isError = task.status === "error";

          // Calculate ETA
          let etaSeconds = 0;
          if (
            isDownloading &&
            task.totalBytes &&
            task.speedBytesPerSec > 0 &&
            task.totalBytes > task.downloadedBytes
          ) {
            const remainingBytes = task.totalBytes - task.downloadedBytes;
            etaSeconds = remainingBytes / task.speedBytesPerSec;
          }

          return (
            <div
              key={task.id}
              id={`task-item-${task.id}`}
              className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-md transition-all"
            >
              {/* Header: Filename & Status */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-100 truncate">
                      {task.filename}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                        isDownloading
                          ? "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20"
                          : isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                          : isError
                          ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {isDownloading && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {isCompleted && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      )}
                      {isError && (
                        <AlertCircle className="h-3 w-3 text-rose-400" />
                      )}
                      <span className="capitalize">{task.status}</span>
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-400 truncate mt-0.5">
                    {task.url}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isDownloading && (
                    <button
                      id={`btn-cancel-task-${task.id}`}
                      onClick={() => onCancelTask(task.id)}
                      className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                      title="Cancel Download"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}

                  {isError && (
                    <button
                      id={`btn-retry-task-${task.id}`}
                      onClick={() => onRetryTask(task.id)}
                      className="flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white"
                      title="Retry Download"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      id={`btn-redownload-task-${task.id}`}
                      onClick={() => onRetryTask(task.id)}
                      className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors"
                      title="Download again"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onRemoveTask(task.id)}
                    className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                    title="Remove from list"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 w-full bg-neutral-800 rounded-full overflow-hidden my-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-emerald-500"
                      : isError
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-indigo-500 to-emerald-400"
                  }`}
                  style={{
                    width: `${Math.max(task.progress, isDownloading ? 5 : 0)}%`,
                  }}
                />
              </div>

              {/* Meta Info: Progress %, Size, Speed, ETA */}
              <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <span>{Math.round(task.progress)}%</span>
                  <span>•</span>
                  <span>
                    {formatBytes(task.downloadedBytes)}
                    {task.totalBytes ? ` / ${formatBytes(task.totalBytes)}` : ""}
                  </span>
                </div>

                {isDownloading && (
                  <div className="flex items-center gap-2 font-mono text-neutral-300">
                    <span className="text-emerald-400 font-semibold">
                      {formatSpeed(task.speedBytesPerSec)}
                    </span>
                    {etaSeconds > 0 && (
                      <>
                        <span>•</span>
                        <span>ETA: {formatDuration(etaSeconds)}</span>
                      </>
                    )}
                  </div>
                )}

                {isError && task.errorMessage && (
                  <span className="text-rose-400 text-xs font-medium">
                    {task.errorMessage}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
