import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Model replies are markdown; map each element to dashboard tokens instead of a prose plugin.
const C: Components = {
  p: (p) => <p className="t-body" {...p} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  em: (p) => <em className="text-muted" {...p} />,
  ul: (p) => <ul className="list-disc space-y-1 pl-5 marker:text-ink3" {...p} />,
  ol: (p) => <ol className="list-decimal space-y-1 pl-5 marker:text-ink3 tabular-nums" {...p} />,
  li: (p) => <li className="t-body pl-1" {...p} />,
  h1: (p) => <h3 className="t-heading" {...p} />,
  h2: (p) => <h3 className="t-heading" {...p} />,
  h3: (p) => <h4 className="t-heading" {...p} />,
  a: (p) => <a className="text-accent underline-offset-2 hover:underline" target="_blank" rel="noreferrer" {...p} />,
  code: (p) => <code className="rounded-sm bg-raised px-1 py-0.5 text-[0.9em]" {...p} />,
  pre: (p) => <pre className="overflow-x-auto rounded-lg bg-surface p-3 t-small [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  blockquote: (p) => <blockquote className="border-l-2 border-hairline pl-3 text-muted" {...p} />,
  hr: () => <hr className="border-hairline" />,
  table: (p) => (
    <div className="overflow-x-auto rounded-lg bg-surface">
      <table className="w-full t-small tabular-nums" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-hairline px-3 py-2 text-left font-semibold text-muted" {...p} />,
  td: (p) => <td className="border-b border-hairline px-3 py-2 last:border-0" {...p} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={C}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
