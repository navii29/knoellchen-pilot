export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";

export const inboundDomain = (): string =>
  process.env.POSTMARK_INBOUND_DOMAIN || "knoellchen-pilot.de";

export const inboundEmailFor = (slug: string): string =>
  `${slug}@${inboundDomain()}`;

export const slugFromInboundAddress = (to: string): string | null => {
  const match = to.toLowerCase().match(/^([a-z0-9._-]+)@/);
  return match ? match[1] : null;
};
