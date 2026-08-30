"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import { postSanitizeSchema } from "@/lib/post-content/sanitize-schema";
import CodeBlock from "./CodeBlock";
import MathBlock from "./MathBlock";

type MarkdownRendererProps = {
  source: string;
  className?: string;
};

function MarkdownRendererInner({ source, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose-custom max-w-none text-[15px] leading-relaxed text-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, postSanitizeSchema]]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-3 mb-1.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-foreground/95 break-words">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 pl-5 list-disc space-y-1 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 pl-5 list-decimal space-y-1 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-4 border-primary/70 bg-primary/5 dark:bg-primary/10 rounded-r-lg px-3.5 py-2 text-foreground/80 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            const isSafe = href && (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:"));
            return isSafe ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-3 hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          hr: () => <hr className="my-4 border-border/70" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs sm:text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/80 border-b border-border font-semibold text-foreground">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3.5 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3.5 py-2">{children}</td>,
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const codeString = String(children).replace(/\n$/, "");
            const isBlock = match || codeString.includes("\n");

            if (isBlock) {
              return (
                <CodeBlock
                  code={codeString}
                  language={match ? match[1] : "text"}
                />
              );
            }

            return (
              <code
                className="rounded-md bg-muted px-1.5 py-0.5 text-xs sm:text-[13px] font-mono text-pink-600 dark:text-pink-400 border border-border/50 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererInner);
export default MarkdownRenderer;
