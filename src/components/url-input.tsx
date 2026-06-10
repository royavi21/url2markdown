"use client";

import { useState, useRef } from "react";
import { Link, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-2xl border-2 bg-background p-1.5 transition-all duration-500",
          isFocused
            ? "border-primary/50 shadow-lg shadow-primary/10 ring-4 ring-primary/10"
            : "border-border hover:border-muted-foreground/30"
        )}
      >
        <div className="flex items-center pl-3 pointer-events-none">
          <Link
            className={cn(
              "size-4 transition-all duration-300",
              isFocused ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <Input
          ref={inputRef}
          type="url"
          placeholder="Paste a URL or GitHub repo link..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
        <div className="flex items-center gap-1 pr-1">
          {url && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrl("");
                inputRef.current?.focus();
              }}
              className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Clear
            </Button>
          )}
          <Button
            type="submit"
            disabled={!url.trim() || isLoading}
            className={cn(
              "h-10 rounded-xl px-5 font-medium transition-all duration-300",
              "bg-foreground text-background hover:bg-foreground/90",
              "shadow-md shadow-foreground/10",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Convert
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
