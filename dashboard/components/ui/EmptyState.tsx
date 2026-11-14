/** Keeps its frame: a dashed hairline box with one sentence. */
export function EmptyState({ children }: { children: string }) {
  return <p className="rounded-md border border-dashed border-hairline px-4 py-6 text-center text-body text-faint">{children}</p>;
}
