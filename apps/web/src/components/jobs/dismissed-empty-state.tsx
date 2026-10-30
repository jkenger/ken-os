/** Empty state for the Dismissed tab before anything has been dismissed. */
export function DismissedEmptyState() {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-5 py-6">
      <h2 className="text-base font-semibold text-foreground">Nothing dismissed yet</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Postings you dismiss from the panel show up here with your reason, and you can undo one at any time.
      </p>
    </div>
  );
}
