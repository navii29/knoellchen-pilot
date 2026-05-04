import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const LegalShell = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <main className="bg-black text-white">
    <Nav />
    <section className="pt-32 pb-12 sm:pt-40 sm:pb-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <h1 className="font-display text-white text-[44px] sm:text-[64px] leading-[1.05] tracking-[-0.03em] font-medium">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-[16px] text-white/60 max-w-2xl">{subtitle}</p>
        )}
      </div>
    </section>
    <section className="bg-stone-50 text-stone-900">
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-20 sm:py-24">
        <article className="prose-legal">{children}</article>
      </div>
    </section>
    <Footer />
  </main>
);

export const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-stone-900 text-[28px] sm:text-[34px] leading-[1.15] tracking-[-0.02em] font-medium mt-14 mb-5 first:mt-0">
    {children}
  </h2>
);

export const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-stone-900 text-[18px] sm:text-[20px] font-semibold mt-8 mb-3">
    {children}
  </h3>
);

export const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15.5px] leading-[1.7] text-stone-700 mb-4">{children}</p>
);

export const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-6 mb-4 space-y-1.5 text-[15.5px] leading-[1.7] text-stone-700 marker:text-stone-400">
    {children}
  </ul>
);

export const Address = ({ children }: { children: React.ReactNode }) => (
  <div className="not-italic text-[15.5px] leading-[1.7] text-stone-800 mb-4 font-medium">
    {children}
  </div>
);

export const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[13.5px] font-mono">
    {children}
  </span>
);
