import React, { useRef, useCallback } from "react";
import jsPDF from "jspdf";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  content: string;
  onBack: () => void;
}

interface ParsedSection {
  type: "heading" | "subheading" | "paragraph" | "list" | "table" | "divider";
  content: string;
  items?: string[];
  rows?: string[][];
  level?: number;
}

function parseContentForPDF(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      sections.push({ type: "subheading", content: line.replace(/^###\s*/, ""), level: 3 });
      i++;
    } else if (line.startsWith("## ")) {
      sections.push({ type: "subheading", content: line.replace(/^##\s*/, ""), level: 2 });
      i++;
    } else if (line.startsWith("# ")) {
      sections.push({ type: "heading", content: line.replace(/^#\s*/, "") });
      i++;
    } else if (line.startsWith("---") || line.startsWith("***")) {
      sections.push({ type: "divider", content: "" });
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i].split("|").filter((c) => c.trim() !== "").map((c) => c.trim());
        if (!lines[i].match(/^\|[\s\-|]+\|$/)) {
          rows.push(row);
        }
        i++;
      }
      if (rows.length > 0) {
        sections.push({ type: "table", content: "", rows });
      }
    } else if (line.match(/^[\-\*•]\s/) || line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].match(/^[\-\*•]\s/) || lines[i].match(/^\d+\.\s/))) {
        items.push(lines[i].replace(/^[\-\*•]\s*/, "").replace(/^\d+\.\s*/, ""));
        i++;
      }
      sections.push({ type: "list", content: "", items });
    } else if (line.trim() === "") {
      i++;
    } else {
      let paragraph = line;
      i++;
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("|") && !lines[i].match(/^[\-\*•]\s/) && !lines[i].match(/^\d+\.\s/) && !lines[i].startsWith("---")) {
        paragraph += " " + lines[i];
        i++;
      }
      sections.push({ type: "paragraph", content: paragraph });
    }
  }

  return sections;
}

export default function ReviewerView({ content, onBack }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfSections = parseContentForPDF(content);

  const downloadPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Study Reviewer", margin, y);
    y += 12;

    for (const section of pdfSections) {
      switch (section.type) {
        case "heading":
          checkPage(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.text(section.content, margin, y);
          y += 10;
          break;

        case "subheading":
          checkPage(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(section.level === 3 ? 11 : 13);
          doc.text(section.content, margin, y);
          y += 8;
          break;

        case "paragraph":
          checkPage(10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const pLines = doc.splitTextToSize(section.content.replace(/<[^>]+>/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1"), maxWidth);
          for (const pl of pLines) {
            checkPage(6);
            doc.text(pl, margin, y);
            y += 5;
          }
          y += 3;
          break;

        case "list":
          if (section.items) {
            for (const item of section.items) {
              checkPage(8);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              const cleanItem = item.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
              const itemLines = doc.splitTextToSize(`• ${cleanItem}`, maxWidth - 5);
              for (const il of itemLines) {
                checkPage(6);
                doc.text(il, margin + 5, y);
                y += 5;
              }
            }
            y += 3;
          }
          break;

        case "table":
          if (section.rows && section.rows.length > 0) {
            checkPage(20);
            const colCount = section.rows[0].length;
            const colWidth = maxWidth / colCount;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, maxWidth, 7, "F");
            section.rows[0].forEach((cell, ci) => {
              doc.text(cell, margin + ci * colWidth + 2, y);
            });
            y += 7;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            for (let ri = 1; ri < section.rows.length; ri++) {
              checkPage(7);
              section.rows[ri].forEach((cell, ci) => {
                const cellText = doc.splitTextToSize(cell, colWidth - 4);
                doc.text(cellText[0] || "", margin + ci * colWidth + 2, y);
              });
              y += 6;
            }
            y += 3;
          }
          break;

        case "divider":
          checkPage(8);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
          break;
      }
    }

    doc.save("study-reviewer.pdf");
  }, [pdfSections]);

  return (
    <div className="reviewer-view page-transition">
      <div className="reviewer-header">
        <h2>Study Reviewer</h2>
        <button className="btn-primary btn-ripple" onClick={downloadPDF}>
          📥 Download PDF
        </button>
      </div>

      <div className="reviewer-content" ref={contentRef}>
        <MarkdownRenderer content={content} className="reviewer-md" />
      </div>
    </div>
  );
}
