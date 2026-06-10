"use client";

import { useState } from "react";
import { GitFork } from "lucide-react";
import { UrlInput } from "@/components/url-input";
import { MarkdownOutput } from "@/components/markdown-output";
import { MarkdownPreview } from "@/components/markdown-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Home() {
  const brassMonoStyle = {
    fontFamily: "var(--font-brass-mono), 'Courier New', monospace",
  } as const;

  const [result, setResult] = useState<{
    markdown: string;
    title: string;
    source: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to convert");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-foreground text-background text-sm font-bold">
              U-M
            </div>
            <span className="text-sm font-semibold hidden sm:inline">
              URL to Markdown
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/royavi21/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitFork className="size-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-20 pb-12 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              Free &amp; Open Source
            </div>
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={brassMonoStyle}
            >
              Turn any URL into
              <br />
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                beautiful Markdown
              </span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-lg text-muted-foreground text-base sm:text-lg"
              style={brassMonoStyle}
            >
              Paste a website link or GitHub repository URL and get clean,
              well-formatted Markdown instantly.
            </p>
          </div>

          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </section>

        {error && (
          <section className="mx-auto max-w-2xl px-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
              {error}
            </div>
          </section>
        )}

        {isLoading && (
          <section className="mx-auto max-w-5xl px-4 pb-16">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
              </div>
            </div>
          </section>
        )}

        {result && !isLoading && (
          <section className="mx-auto max-w-5xl px-4 pb-16">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Converted
              </span>
              <span className="truncate max-w-[300px] text-xs">
                {result.source}
              </span>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <MarkdownOutput markdown={result.markdown} title={result.title} />
              <MarkdownPreview markdown={result.markdown} />
            </div>
          </section>
        )}

        {!result && !isLoading && !error && (
          <section className="mx-auto max-w-3xl px-4 pb-20">
            <div className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                {
                  title: "Web Pages",
                  desc: "Extract readable content from any article or documentation page",
                  icon: "🌐",
                },
                {
                  title: "GitHub Repos",
                  desc: "Generate detailed READMEs with tech stack and OS install guides",
                  icon: "📦",
                },
                {
                  title: "Copy & Export",
                  desc: "Copy to clipboard or download as .md file instantly",
                  icon: "📋",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:shadow-md hover:border-foreground/20"
                >
                  <div className="mb-3 text-2xl">{item.icon}</div>
                  <h3 className="mb-1 text-sm font-semibold" style={brassMonoStyle}>
                    {item.title}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground leading-relaxed"
                    style={brassMonoStyle}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p style={brassMonoStyle}>
          URL to Markdown &mdash; Convert any link to clean Markdown
        </p>
      </footer>
    </div>
  );
}
