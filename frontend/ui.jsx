// Shared UI: client-side navigation and small components used by both screens.
import { useState } from "react";

// ---- Navigation -------------------------------------------------------------------

export function navigate(to) {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({ href, className, children }) {
  function onClick(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigate(href);
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

// ---- Shared UI pieces ------------------------------------------------------------------

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900";
export const primaryButton =
  "w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60";
export const linkClass = "mt-4 inline-block font-semibold text-indigo-600 hover:underline dark:text-indigo-400";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className={`rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 ${className}`}
    >
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </button>
  );
}

export function CenteredMessage({ children }) {
  return <main className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">{children}</main>;
}
