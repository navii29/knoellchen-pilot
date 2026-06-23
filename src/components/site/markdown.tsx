import React from "react";

// Markdown-lite Renderer für richtext-Blöcke. Rendert AUSSCHLIESSLICH als
// React-Elemente (Text-Knoten) — KEIN dangerouslySetInnerHTML, also kein Weg
// für rohes HTML / XSS aus vom Vermieter gepflegtem Inhalt.
//
// Unterstützt: Absätze (Leerzeile), ## Überschriften, - / * Listen.
// Inline-Formatierung wird absichtlich NICHT interpretiert (alles als Text).

export function MarkdownLite({ text }: { text: string }) {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];

  let para: string[] = [];
  let list: string[] = [];

  const flushPara = (key: string) => {
    if (para.length === 0) return;
    blocks.push(
      <p key={key} className="leading-relaxed text-[var(--site-ink-soft)]">
        {para.join(" ")}
      </p>
    );
    para = [];
  };
  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5 text-[var(--site-ink-soft)]">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line === "") {
      flushPara(`p-${i}`);
      flushList(`l-${i}`);
      return;
    }
    if (line.startsWith("## ")) {
      flushPara(`p-${i}`);
      flushList(`l-${i}`);
      blocks.push(
        <h3 key={`h-${i}`} className="text-xl font-semibold text-[var(--site-ink)]">
          {line.slice(3).trim()}
        </h3>
      );
      return;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara(`p-${i}`);
      list.push(line.slice(2).trim());
      return;
    }
    para.push(line);
  });
  flushPara("p-end");
  flushList("l-end");

  return <div className="space-y-4">{blocks}</div>;
}
