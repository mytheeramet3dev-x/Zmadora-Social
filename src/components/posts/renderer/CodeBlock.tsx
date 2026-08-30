"use client";

import React, { useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import CopyButton from "@/components/posts/copy/CopyButton";
import { ChevronDownIcon, ChevronUpIcon, Code2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rs: "rust",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  yml: "yaml",
  html: "markup",
  xml: "markup",
  svg: "markup",
  md: "markdown",
};

function normalizeLanguage(lang?: string): string {
  if (!lang) return "text";
  const clean = lang.trim().toLowerCase().replace(/^language-/, "");
  return LANGUAGE_ALIASES[clean] || clean;
}

export default function CodeBlock({
  code,
  language = "text",
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedLang = useMemo(() => normalizeLanguage(language), [language]);

  const lines = useMemo(() => code.split("\n"), [code]);
  const isLongCode = lines.length > 25;

  const highlightedHtml = useMemo(() => {
    const grammar = Prism.languages[normalizedLang];
    if (grammar) {
      try {
        return Prism.highlight(code, grammar, normalizedLang);
      } catch {
        // Fallback to escaped text on highlight error
      }
    }
    // Safe text escape fallback
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }, [code, normalizedLang]);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[var(--code-border)] bg-[var(--code-bg)] text-[var(--code-text)] shadow-xs transition-colors group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--code-border)] bg-[var(--code-header-bg)] px-3.5 py-1.5 text-xs text-[var(--code-header-text)]">
        <div className="flex items-center gap-2 min-w-0">
          <Code2Icon className="h-3.5 w-3.5 opacity-70 shrink-0" />
          <span className="font-mono font-semibold tracking-wide uppercase text-[11px] truncate">
            {filename || normalizedLang}
          </span>
          <span className="text-[10px] opacity-60">
            ({lines.length} {lines.length === 1 ? "line" : "lines"})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CopyButton
            text={code}
            label="Copy code"
            ariaLabel={`Copy ${normalizedLang} code`}
          />
        </div>
      </div>

      {/* Code Content with Line Numbers & Horizontal Scroll */}
      <div
        className={`relative overflow-x-auto text-[13px] sm:text-sm font-mono leading-relaxed p-3.5 transition-all ${
          isLongCode && !isExpanded ? "max-h-[380px] overflow-hidden" : ""
        }`}
      >
        <div className="flex min-w-full">
          {showLineNumbers && lines.length > 1 ? (
            <div
              aria-hidden="true"
              className="select-none pr-4 text-right text-[var(--code-line-num)] font-mono text-xs opacity-60 shrink-0 border-r border-[var(--code-border)]/60 mr-3"
            >
              {lines.map((_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>
          ) : null}

          <pre className="flex-1 overflow-x-auto p-0 m-0 bg-transparent font-mono text-[var(--code-text)]">
            <code
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className="bg-transparent p-0 font-mono text-inherit"
            />
          </pre>
        </div>

        {/* Expand / Collapse gradient overlay for long code */}
        {isLongCode && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--code-bg)] via-[var(--code-bg)]/80 to-transparent flex items-end justify-center pb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 px-3 text-xs font-medium rounded-full bg-[var(--code-header-bg)] border-[var(--code-border)] shadow-xs hover:bg-accent"
            >
              <ChevronDownIcon className="h-3.5 w-3.5 mr-1" />
              Show full code ({lines.length} lines)
            </Button>
          </div>
        )}
      </div>

      {isLongCode && isExpanded && (
        <div className="border-t border-[var(--code-border)] bg-[var(--code-header-bg)] px-3 py-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronUpIcon className="h-3.5 w-3.5 mr-1" />
            Collapse code
          </Button>
        </div>
      )}
    </div>
  );
}
