import type { RichTextContent } from "@/lib/site/types";
import { MarkdownLite } from "@/components/site/markdown";

export function RichText({ content }: { content: RichTextContent }) {
  return (
    <section className="bg-[var(--site-bg)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {content.title ? (
          <h2 className="mb-6 font-[var(--site-font)] text-3xl font-bold text-[var(--site-ink)]">
            {content.title}
          </h2>
        ) : null}
        <MarkdownLite text={content.body} />
      </div>
    </section>
  );
}
