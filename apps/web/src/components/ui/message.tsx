import type { ComponentProps, HTMLAttributes } from "react";
import { panel } from "@/components/surfaces";
import { cn } from "@/lib/utils";

/** From shadcn's AI Elements, trimmed to the bubble layout: no branches, actions, or markdown rendering. */
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: "user" | "assistant";
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn("group flex w-full max-w-[85%] flex-col gap-2", from === "user" ? "is-user ml-auto" : "is-assistant", className)}
    {...props}
  />
);

export type MessageContentProps = ComponentProps<"div">;

export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div
    className={cn(panel, "px-3 py-2 text-sm", "group-[.is-user]:bg-accent", className)}
    {...props}
  />
);
