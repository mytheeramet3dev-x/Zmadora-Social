"use client";

import React, { useMemo } from "react";
import katex from "katex";
import CopyButton from "@/components/posts/copy/CopyButton";

type MathBlockProps = {
  formula: string;
};

export default function MathBlock({ formula }: MathBlockProps) {
  const cleanFormula = useMemo(() => formula.trim(), [formula]);

  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(cleanFormula, {
        displayMode: true,
        throwOnError: false,
        trust: false,
        strict: false,
      });
    } catch {
      return cleanFormula;
    }
  }, [cleanFormula]);

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-[var(--math-border)] bg-[var(--math-bg)] p-3 sm:p-4 text-[var(--math-text)] shadow-xs transition-colors group">
      {/* Top right Copy LaTeX pill */}
      <div className="absolute top-2 right-2 opacity-80 group-hover:opacity-100 transition-opacity">
        <CopyButton
          text={cleanFormula}
          label="Copy LaTeX"
          ariaLabel="Copy LaTeX formula"
          className="h-6 px-2 text-[11px] bg-background/80 backdrop-blur-xs border border-border/70 rounded-full shadow-xs"
        />
      </div>

      {/* Rendered Math Formula with horizontal scroll */}
      <div className="overflow-x-auto py-2 px-1 text-center min-w-0">
        <div
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          className="inline-block min-w-0 font-serif"
        />
      </div>
    </div>
  );
}
