import React, { useMemo } from "react";
import katex from "katex";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderLatex(text: string): string {
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="math-block"><code>${escapeHtml(math)}</code></div>`;
    }
  });

  text = text.replace(/\\\((.*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${escapeHtml(math)}</code>`;
    }
  });

  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return `<div class="math-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="math-block"><code>${escapeHtml(math)}</code></div>`;
    }
  });

  text = text.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${escapeHtml(math)}</code>`;
    }
  });

  return text;
}

function protectHtmlTags(text: string): { cleaned: string; tags: string[] } {
  const tags: string[] = [];
  const cleaned = text.replace(/<[^>]+>/g, (match) => {
    const idx = tags.length;
    tags.push(match);
    return `%%HTMLTAG${idx}%%`;
  });
  return { cleaned, tags };
}

function restoreHtmlTags(text: string, tags: string[]): string {
  tags.forEach((tag, idx) => {
    text = text.replace(`%%HTMLTAG${idx}%%`, tag);
  });
  return text;
}

function applyInlineFormatting(text: string): string {
  const { cleaned, tags } = protectHtmlTags(text);
  let escaped = escapeHtml(cleaned);
  escaped = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
  return restoreHtmlTags(escaped, tags);
}

function renderMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="md-code-block"><code class="language-${lang || "text"}">${escapeHtml(code.trim())}</code></pre>`
    );
    return `%%CODEBLOCK${idx}%%`;
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="md-inline-code">${escapeHtml(code)}</code>`);
    return `%%INLINECODE${idx}%%`;
  });

  text = renderLatex(text);

  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType = "ul";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/%%CODEBLOCK\d+%%/)) {
      if (inList) {
        result.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
      }
      result.push(line);
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      if (inList) {
        result.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
      }
      const level = line.match(/^(#+)/)?.[1].length || 1;
      const content = line.replace(/^#+\s*/, "");
      const tag = Math.min(level + 1, 6);
      result.push(`<h${tag} class="md-h${level}">${applyInlineFormatting(content)}</h${tag}>`);
      continue;
    }

    if (line.match(/^\s*[-*+]\s/)) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(listType === "ol" ? "</ol>" : "</ul>");
        result.push('<ul class="md-list">');
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${applyInlineFormatting(line.replace(/^\s*[-*+]\s*/, ""))}</li>`);
      continue;
    }

    if (line.match(/^\s*\d+\.\s/)) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(listType === "ol" ? "</ol>" : "</ul>");
        result.push('<ol class="md-list">');
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${applyInlineFormatting(line.replace(/^\s*\d+\.\s*/, ""))}</li>`);
      continue;
    }

    if (line.match(/^[-*_]{3,}\s*$/)) {
      if (inList) {
        result.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
      }
      result.push('<hr class="md-divider" />');
      continue;
    }

    if (line.trim() === "") {
      if (inList) {
        result.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
      }
      continue;
    }

    if (inList) {
      result.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
    }
    result.push(`<p class="md-paragraph">${applyInlineFormatting(line)}</p>`);
  }

  if (inList) result.push(listType === "ol" ? "</ol>" : "</ul>");

  let html = result.join("\n");

  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK${idx}%%`, block);
  });

  inlineCodes.forEach((code, idx) => {
    html = html.replace(new RegExp(`%%INLINECODE${idx}%%`, "g"), code);
  });

  return html;
}

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className={`markdown-content ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
