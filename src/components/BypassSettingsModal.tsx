import React from "react";
import { X, Sliders, ShieldCheck, Check } from "lucide-react";
import { BypassConfig } from "../types";
import { USER_AGENT_PRESETS } from "../utils/formatters";

interface BypassSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BypassConfig;
  onChangeConfig: (newConfig: BypassConfig) => void;
}

export const BypassSettingsModal: React.FC<BypassSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        id="modal-bypass-settings"
        className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Restriction Bypass Settings
              </h3>
              <p className="text-xs text-neutral-400">
                Override browser client headers to bypass hotlinking and anti-bot blocks
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

        {/* User-Agent Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Client User-Agent
          </label>
          <p className="text-xs text-neutral-400">
            Some hosts reject headless requests or require desktop browser identity.
          </p>
          <div className="space-y-1.5">
            {USER_AGENT_PRESETS.map((preset) => {
              const isSelected = config.userAgent === preset.value;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, userAgent: preset.value })}
                  className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/30 text-white"
                      : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                  }`}
                >
                  <span className="font-medium">{preset.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={config.userAgent}
            onChange={(e) => onChangeConfig({ ...config, userAgent: e.target.value })}
            placeholder="Or type custom User-Agent..."
            className="w-full mt-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Referer Spoofing */}
        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
            HTTP Referer Header (Hotlink Bypass)
          </label>
          <p className="text-xs text-neutral-400">
            Many CDNs block media if requested from an external site.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, refererMode: "origin" })}
              className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                config.refererMode === "origin"
                  ? "border-emerald-500 bg-emerald-950/30 font-semibold text-emerald-300"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              Auto Origin (Default)
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, refererMode: "none" })}
              className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                config.refererMode === "none"
                  ? "border-emerald-500 bg-emerald-950/30 font-semibold text-emerald-300"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              Blank / Stripped
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, refererMode: "custom" })}
              className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                config.refererMode === "custom"
                  ? "border-emerald-500 bg-emerald-950/30 font-semibold text-emerald-300"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              Custom URL
            </button>
          </div>

          {config.refererMode === "custom" && (
            <input
              type="url"
              value={config.customReferer}
              onChange={(e) => onChangeConfig({ ...config, customReferer: e.target.value })}
              placeholder="https://example.com/source-page"
              className="w-full mt-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-200 focus:border-indigo-500 focus:outline-none"
            />
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
