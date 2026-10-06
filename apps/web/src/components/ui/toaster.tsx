"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Ken OS notifications ("toasts"): short messages after something happens, such as a save or a finished lookup.
// Any module calls toast(); <Toaster /> in the workspace shell shows them. Errors stay until dismissed.

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  /** Either run something, or link somewhere in Ken OS. */
  onClick?: () => void | Promise<void>;
  href?: string;
}

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  /** Milliseconds before it disappears. Errors default to staying until dismissed. */
  duration?: number;
}

interface ToastItem extends ToastInput { id: number; tone: ToastTone }

const MAX_VISIBLE = 3;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function toast(input: ToastInput) {
  const item: ToastItem = { ...input, tone: input.tone ?? "info", id: nextId++ };
  items = [...items, item].slice(-MAX_VISIBLE);
  emit();
  return item.id;
}

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const tones: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-foreground" },
  success: { icon: Check, className: "text-status-solid" },
  error: { icon: CircleAlert, className: "text-status-gap" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const duration = item.duration ?? (item.tone === "error" ? 0 : 6000);
  const Icon = tones[item.tone].icon;

  useEffect(() => {
    if (!duration || paused) return;
    const timer = window.setTimeout(() => dismissToast(item.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, paused, item.id]);

  async function run() {
    if (!item.action?.onClick) return;
    setBusy(true);
    try { await item.action.onClick(); } finally { setBusy(false); dismissToast(item.id); }
  }

  return (
    <li role={item.tone === "error" ? "alert" : "status"} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full gap-3 rounded-xl bg-popover p-4 text-sm shadow-xl ring-1 ring-foreground/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <Icon size={17} className={cn("mt-0.5 shrink-0", tones[item.tone].className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-5">{item.title}</p>
        {item.description && <p className="mt-1 leading-5 text-muted-foreground">{item.description}</p>}
        {item.action && (
          item.action.href
            ? <Link href={item.action.href} onClick={() => dismissToast(item.id)} className="mt-2 inline-flex text-sm font-semibold underline-offset-4 hover:underline">{item.action.label}</Link>
            : <button type="button" disabled={busy} onClick={() => void run()} className="mt-2 inline-flex rounded-md text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-50">{busy ? "Working..." : item.action.label}</button>
        )}
      </div>
      <button type="button" className="h-fit rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss" onClick={() => dismissToast(item.id)}><X size={15} /></button>
    </li>
  );
}

/** Bottom right on desktop, full width at the bottom on a phone. Newest at the bottom; at most three at once. */
export function Toaster() {
  const current = useSyncExternalStore(subscribe, () => items, () => items);
  return (
    <ol aria-label="Notifications" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px]">
      {current.map((item) => <ToastCard key={item.id} item={item} />)}
    </ol>
  );
}
