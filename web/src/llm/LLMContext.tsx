import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { LLMConfig, AppConfig } from "../types/llm";

interface LLMContextValue {
  config: AppConfig | null;
  isLLMConfigured: boolean;
  updateLLMConfig: (config: LLMConfig) => void;
}

const LLMContext = createContext<LLMContextValue | null>(null);

const LS_LLM_CONFIG = "cm-llm-config";

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function isNativeApp(): boolean {
  return !!(window as unknown as Record<string, unknown>).webkit;
}

function sendToSwift(handler: string, payload?: unknown) {
  const webkit = (window as unknown as Record<string, unknown>).webkit as
    | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
    | undefined;
  webkit?.messageHandlers?.[handler]?.postMessage(payload ?? {});
}

export function LLMProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Load config on mount
  useEffect(() => {
    if (isNativeApp()) {
      // Register callback before requesting
      const win = window as unknown as Record<string, unknown>;
      win.configLoaded = (json: string) => {
        try {
          const parsed = JSON.parse(json) as AppConfig;
          setConfig(parsed);
        } catch {
          setConfig({});
        }
      };
      sendToSwift("loadConfig");
      return () => { delete win.configLoaded; };
    } else {
      // Browser fallback: localStorage
      try {
        const raw = lsGet(LS_LLM_CONFIG);
        setConfig(raw ? JSON.parse(raw) : {});
      } catch {
        setConfig({});
      }
    }
  }, []);

  const updateLLMConfig = useCallback((llmConfig: LLMConfig) => {
    const newConfig: AppConfig = { ...config, llm: llmConfig };
    setConfig(newConfig);

    if (isNativeApp()) {
      sendToSwift("saveConfig", JSON.stringify({ content: JSON.stringify(newConfig, null, 2) }));
    } else {
      lsSet(LS_LLM_CONFIG, JSON.stringify(newConfig));
    }
  }, [config]);

  const isLLMConfigured = !!(config?.llm?.model && (config.llm.apiKey || config.llm.provider === "ollama"));

  return (
    <LLMContext.Provider value={{ config, isLLMConfigured, updateLLMConfig }}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) throw new Error("useLLM must be used within LLMProvider");
  return ctx;
}
