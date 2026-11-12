"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: (props) => <h2 className="mt-4 mb-2 text-lg font-semibold text-ink first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-4 mb-2 text-base font-semibold text-ink first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-3 mb-1.5 text-sm font-semibold text-ink first:mt-0" {...props} />,
  h4: (props) => <h5 className="mt-3 mb-1.5 text-sm font-semibold text-ink first:mt-0" {...props} />,
  p: (props) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand/60" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-brand/60" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: (props) => (
    <a
      className="text-brand underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-gray-600" {...props} />
  ),
  hr: () => <hr className="my-4 border-line" />,
  code: ({ className, children, ...props }) =>
    className ? (
      <code className={`${className} font-mono text-[13px]`} {...props}>
        {children}
      </code>
    ) : (
      <code className="rounded-md bg-tint px-1.5 py-0.5 font-mono text-[13px]" {...props}>
        {children}
      </code>
    ),
  pre: (props) => (
    <pre className="my-3 overflow-x-auto rounded-xl border border-line bg-tint p-3" {...props} />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-line-strong px-3 py-2 font-semibold text-ink" {...props} />
  ),
  td: (props) => <td className="border-b border-line px-3 py-2" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="break-words text-sm leading-relaxed text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
