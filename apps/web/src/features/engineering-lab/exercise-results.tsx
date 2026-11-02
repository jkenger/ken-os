"use client";

import { useState, type ReactNode } from "react";
import { DotSeparator } from "@/components/dot-separator";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { lineDiff, type DiffLine } from "@/features/engineering-lab/runner/diff";
import type { CallRecord, LogLine, Mismatch, TestResult } from "@/features/engineering-lab/runner/harness";
import { cn } from "@/lib/utils";

// What a run of the exercise showed: each test's calls, expected against got, and console output.

const mono = "font-mono text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]";
const block = "mt-1 rounded-md border bg-background px-2.5 py-1.5";
/** Console output and long values start folded past this many lines. */
const FOLD_LINES = 8;
/** Whether a recorded call is code that runs as shown: nothing shortened, no class instance or circular value. */
const runnable = (call: string) => !/…|\[Circular\]|[A-Za-z_$][\w$]* \{/.test(call);

function Label({ children }: { children: string }) {
  return <p className="mt-2.5 text-xs font-semibold text-foreground">{children}</p>;
}

/** Text that folds after FOLD_LINES lines, with a toggle to show the rest. */
function Folded({ lines, render }: { lines: string[]; render: (line: string, index: number) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const shown = open ? lines : lines.slice(0, FOLD_LINES);
  return (
    <>
      {shown.map(render)}
      {lines.length > FOLD_LINES && (
        <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => setOpen(!open)}>
          {open ? "Show less" : `Show all ${lines.length} lines`}
        </Button>
      )}
    </>
  );
}

export function ConsoleOutput({ lines, label = "Console" }: { lines: LogLine[]; label?: string }) {
  const rows = lines.flatMap((line) => line.text.split("\n").map((text) => ({ level: line.level, text })));
  return (
    <>
      <Label>{label}</Label>
      <div className={cn(block, mono)} role="log" aria-label={label}>
        <Folded
          lines={rows.map((row) => row.text)}
          render={(text, index) => (
            <div key={index} className={cn(rows[index].level !== "log" && "text-destructive")}>
              {rows[index].level !== "log" && <span className="sr-only">{rows[index].level}: </span>}
              {text || " "}
            </div>
          )}
        />
      </div>
    </>
  );
}

export function Value({ text, label }: { text: string; label: string }) {
  return (
    <div className={cn(block, mono)} aria-label={label}>
      <Folded lines={text.split("\n")} render={(line, index) => <div key={index}>{line || " "}</div>} />
    </div>
  );
}

function Calls({ calls, more, onTry }: { calls: CallRecord[]; more?: number; onTry?: (call: string) => void }) {
  return (
    <>
      <Label>{calls.length === 1 ? "Call" : "Calls"}</Label>
      <ul className="mt-1 space-y-1.5">
        {calls.map((item, index) => (
          <li key={index} className={cn(block, "mt-0")}>
            <div className="flex items-start justify-between gap-2">
              <code className={cn(mono, "min-w-0 text-foreground")}>{item.call}</code>
              {onTry && runnable(item.call) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="-my-0.5 shrink-0"
                  onClick={() => onTry(item.call)}
                  aria-label={`Try ${item.call}`}
                >
                  Try
                </Button>
              )}
            </div>
            <p className={cn(mono, item.threw && "text-destructive")}>
              {item.threw
                ? `threw ${item.threw}`
                : item.returned === undefined
                  ? "still running"
                  : `→ ${item.returned}`}
            </p>
          </li>
        ))}
      </ul>
      {Boolean(more) && <p className="mt-1 text-xs">{more} more calls</p>}
    </>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const sign = line.kind === "expected" ? "−" : line.kind === "got" ? "+" : " ";
  const tone =
    line.kind === "expected"
      ? "bg-muted text-foreground"
      : line.kind === "got"
        ? "bg-destructive/10 text-foreground"
        : "";
  const mark = line.kind === "expected" ? "bg-foreground/15" : "bg-destructive/25";
  const [from, to] = line.changed ?? [0, 0];
  return (
    <div className={cn("flex pr-2", tone)}>
      <span aria-hidden="true" className="w-5 shrink-0 pl-1.5 select-none">
        {sign}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{line.kind === "same" ? "" : `${line.kind}: `}</span>
        {line.changed && to > from ? (
          <>
            {line.text.slice(0, from)}
            <mark className={cn("rounded-sm text-inherit", mark)}>{line.text.slice(from, to)}</mark>
            {line.text.slice(to)}
          </>
        ) : (
          line.text || " "
        )}
      </span>
    </div>
  );
}

function Difference({ mismatch }: { mismatch: Mismatch }) {
  const lines = lineDiff(mismatch.expected, mismatch.actual);
  return (
    <>
      {mismatch.path && (
        <p className="mt-2.5 text-xs text-foreground">
          First difference at <code className="font-mono font-semibold">{mismatch.path}</code>: expected{" "}
          <code className="font-mono">{mismatch.expectedAt}</code>, got{" "}
          <code className="font-mono">{mismatch.actualAt}</code>
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-foreground">
        <span>Difference</span>
        <span className="font-normal" aria-hidden="true">
          − expected
          <DotSeparator />+ got
        </span>
      </div>
      <div className={cn(block, mono, "px-0")} aria-label="Expected against got">
        {lines.map((line, index) => (
          <DiffRow key={index} line={line} />
        ))}
      </div>
    </>
  );
}

function TestDetail({ item, onTry }: { item: TestResult; onTry?: (call: string) => void }) {
  return (
    <div className="mt-1 text-muted-foreground">
      {item.calls?.length ? <Calls calls={item.calls} more={item.moreCalls} onTry={onTry} /> : null}
      {item.mismatch ? (
        <Difference mismatch={item.mismatch} />
      ) : (
        item.error &&
        !item.calls?.some((call) => call.threw?.endsWith(`: ${item.error}`)) && (
          <p className={cn(mono, "mt-2.5")}>{item.error}</p>
        )
      )}
      {item.console?.length ? <ConsoleOutput lines={item.console} /> : null}
    </div>
  );
}

export function TestList({
  results,
  logs = [],
  onTry,
}: {
  results: TestResult[];
  /** Console output from outside any test, such as top-level code. */
  logs?: string[];
  onTry?: (call: string) => void;
}) {
  const passed = results.filter((item) => item.passed).length;
  return (
    <div role="status">
      <p className="text-sm font-semibold">
        {passed} / {results.length} tests passed
      </p>
      {logs.length > 0 && (
        <ConsoleOutput lines={logs.map((text) => ({ level: "log", text }))} label="Console before tests" />
      )}
      <ul className="mt-3 space-y-4 text-xs">
        {results.map((item) => (
          <li key={item.name} className="flex items-start gap-2.5">
            <Pill tone={item.passed ? "solid" : "gap"}>{item.passed ? "Pass" : "Fail"}</Pill>
            <div className="min-w-0 flex-1">
              <p className="text-foreground">{item.name}</p>
              {(!item.passed || item.console?.length) && <TestDetail item={item} onTry={onTry} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
