"use client";

import React, { memo } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import CopyButton from "@/components/posts/copy/CopyButton";

type PostContentRendererProps = {
  source: string | null;
  contentType?: "TEXT" | "MARKDOWN" | string;
  showCopyMarkdown?: boolean;
};

function PostContentRendererInner({
  source,
  contentType = "TEXT",
  showCopyMarkdown = true,
}: PostContentRendererProps) {
  if (!source) return null;

  const isMarkdown = contentType === "MARKDOWN";

  if (!isMarkdown) {
    return (
      <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground break-words">
        {source}
      </p>
    );
  }

  return (
    <div className="mt-2.5 space-y-2">
      <MarkdownRenderer source={source} />

      {showCopyMarkdown && (
        <div className="flex justify-end pt-1">
          <CopyButton
            text={source}
            label="Copy Markdown"
            ariaLabel="Copy raw Markdown source"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-full"
          />
        </div>
      )}
    </div>
  );
}

export const PostContentRenderer = memo(PostContentRendererInner);
export default PostContentRenderer;
