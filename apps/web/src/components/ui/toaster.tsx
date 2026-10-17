"use client";

import { toast as sonner } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Loots notifications ("toasts"): short messages after something happens, such as a save or a finished lookup.
// Any module calls toast(); <Toaster /> in the workspace shell shows them through shadcn's Sonner. Errors stay
// until dismissed.

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  /** Either run something, or link somewhere in Loots. */
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

export function toast(input: ToastInput) {
  const tone = input.tone ?? "info";
  const show = tone === "error" ? sonner.error : tone === "success" ? sonner.success : sonner.info;
  const { action } = input;
  return show(input.title, {
    description: input.description,
    duration: input.duration ?? (tone === "error" ? Infinity : 6000),
    closeButton: true,
    action: action && {
      label: action.label,
      onClick: () => {
        if (action.href) window.location.assign(action.href);
        else void action.onClick?.();
      },
    },
  });
}

export function dismissToast(id: string | number) {
  sonner.dismiss(id);
}

/** Bottom right on desktop, full width at the bottom on a phone. At most three at once. Light only, since Loots has no theme switch yet. */
export function Toaster() {
  return <Sonner theme="light" position="bottom-right" visibleToasts={3} containerAriaLabel="Notifications" />;
}
