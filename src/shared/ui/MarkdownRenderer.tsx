"use client";

import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  // Simple markdown to HTML conversion
  const html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">$1</blockquote>')
    // Unordered lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="my-4 leading-relaxed">')
    // Line breaks
    .replace(/\n/g, '<br />');

  return (
    <div
      className={cn("prose prose-slate dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: `<p class="my-4 leading-relaxed">${html}</p>` }}
    />
  );
}
