"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  text: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function CopyButton({
  text,
  label = "Copy",
  ariaLabel,
  className = "",
  iconOnly = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure / older browser contexts
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      onClick={handleCopy}
      aria-label={ariaLabel || label}
      className={[
        "h-7 px-2 text-xs font-medium rounded-md transition-all duration-150 active:scale-95 focus-visible:ring-1",
        copied
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        className,
      ].join(" ")}
      title={copied ? "Copied to clipboard" : ariaLabel || label}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-emerald-500 mr-1 animate-in zoom-in-75 duration-150" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5 mr-1" />
      )}
      {!iconOnly && <span>{copied ? "Copied!" : label}</span>}
    </Button>
  );
}
