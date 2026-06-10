"use client";

import { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MarkdownOutputProps {
  markdown: string;
  title: string;
}

export function MarkdownOutput({ markdown, title }: MarkdownOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            <span className="font-medium">Output</span>
            <span className="hidden sm:inline text-muted-foreground/60">
              &middot; {markdown.length.toLocaleString()} chars
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 rounded-lg px-2 text-xs"
            >
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 rounded-lg px-2"
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="ml-1.5 text-xs">
                {copied ? "Copied!" : "Copy"}
              </span>
            </Button>
          </div>
        </div>
        <div className="relative">
          <pre className="overflow-auto p-4 text-sm leading-relaxed max-h-[500px] scrollbar-thin">
            <code className="text-foreground/90">{markdown}</code>
          </pre>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
        </div>
      </div>
    </div>
  );
}
