import { z } from "zod";
import { amountSchema, idSchema, imageUrlSchema, isoDateTimeSchema, themeSchema } from "./common";

export const eventKindSchema = z.enum(["match", "concert", "festival", "comedy", "classical", "cinema"]);
export type EventKind = z.infer<typeof eventKindSchema>;

export const venueLayoutSchema = z.enum(["stadium", "arena", "hall", "cinema"]);
export type VenueLayout = z.infer<typeof venueLayoutSchema>;

export const saleStatusSchema = z.enum(["on_sale", "few_left", "presale", "queue", "sold_out", "coming_soon", "cancelled", "postponed"]);
export type SaleStatus = z.infer<typeof saleStatusSchema>;

export const citySchema = z.enum(["cairo", "alexandria", "canal", "red_sea", "delta"]);
export type City = z.infer<typeof citySchema>;

export const cityLabels: Record<City, string> = {
  cairo: "Cairo & Giza",
  alexandria: "Alexandria",
  canal: "Canal cities",
  red_sea: "Red Sea",
  delta: "Delta",
};

export const eventTabSchema = z.enum(["matches", "concerts", "cinema"]);
export type EventTab = z.infer<typeof eventTabSchema>;

export const teamSchema = z.object({
  name: z.string().min(1),
  short: z.string().min(2).max(4),
  /** Club crest or national flag. */
  logoUrl: imageUrlSchema.optional(),
});
export type Team = z.infer<typeof teamSchema>;

export const venueSchema = z.object({
  name: z.string().min(1),
  area: z.string().min(1),
  city: citySchema,
});
export type Venue = z.infer<typeof venueSchema>;

export const eventSummarySchema = z.object({
  id: idSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kind: eventKindSchema,
  layout: venueLayoutSchema,
  category: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  tag: z.string().min(1),
  art: z.string().min(1),
  /** Cover photo (16:9) for cards, heroes and tickets; the themed `art` block is shown when absent. */
  imageUrl: imageUrlSchema.optional(),
  theme: themeSchema,
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.optional(),
  venue: venueSchema,
  priceFrom: amountSchema,
  status: saleStatusSchema,
  statusLabel: z.string().min(1),
  requiresFanId: z.boolean(),
  maxPerOrder: z.number().int().positive(),
  serviceFee: amountSchema,
  homeTeam: teamSchema.optional(),
  awayTeam: teamSchema.optional(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;

export const zoneAvailabilitySchema = z.enum(["available", "few_left", "high_demand", "restricted", "sold_out"]);
export type ZoneAvailability = z.infer<typeof zoneAvailabilitySchema>;

export const priceRowSchema = z.object({
  name: z.string(),
  where: z.string(),
  price: amountSchema,
  availability: zoneAvailabilitySchema,
  availabilityLabel: z.string(),
});
export type PriceRow = z.infer<typeof priceRowSchema>;

export const faqSchema = z.object({ question: z.string(), answer: z.string() });
export type Faq = z.infer<typeof faqSchema>;

export const eventDetailSchema = eventSummarySchema.extend({
  description: z.string(),
  headline: z.string(),
  saleOpensAt: isoDateTimeSchema.optional(),
  doorsAt: z.string().optional(),
  gatesOpenAt: z.string().optional(),
  badges: z.array(z.string()),
  priceTable: z.array(priceRowSchema),
  priceNote: z.string(),
  gates: z.array(z.object({ gates: z.string(), area: z.string() })).optional(),
  gatesNote: z.string().optional(),
  rules: z.array(z.string()),
  rulesTitle: z.string(),
  faqs: z.array(faqSchema),
  runningOrder: z.array(z.object({ time: z.string(), label: z.string(), headline: z.boolean().optional() })).optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  promoter: z.string().optional(),
  scarcityNote: z.string().optional(),
  queueEnabled: z.boolean(),
  presaleCodeEnabled: z.boolean(),
});
export type EventDetail = z.infer<typeof eventDetailSchema>;

const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess((value) => (typeof value === "string" ? value.split(",").filter(Boolean) : value), z.array(item));

const booleanParam = z.preprocess((value) => value === true || value === "true" || value === "1", z.boolean());

export const eventsQuerySchema = z.object({
  tab: eventTabSchema.default("matches"),
  q: z.string().trim().max(80).optional(),
  categories: csv(z.string().min(1)).optional(),
  cities: csv(citySchema).optional(),
  from: z.iso.date().optional(),
  availableOnly: booleanParam.optional(),
});
/** Client-side shape of the browse query (before URL serialisation). */
export type EventsQuery = {
  tab?: EventTab;
  q?: string;
  categories?: string[];
  cities?: City[];
  from?: string;
  availableOnly?: boolean;
};
export type EventsQueryParsed = z.output<typeof eventsQuerySchema>;

export const eventsResponseSchema = z.object({
  items: z.array(eventSummarySchema),
  total: z.number().int().nonnegative(),
  facets: z.object({ categories: z.array(z.string()), cities: z.array(citySchema) }),
});
export type EventsResponse = z.infer<typeof eventsResponseSchema>;

export const homeResponseSchema = z.object({
  featured: z.array(eventDetailSchema),
  onSale: z.array(eventSummarySchema),
  comingSoon: z.array(eventSummarySchema),
  categories: z.array(z.string()),
});
export type HomeResponse = z.infer<typeof homeResponseSchema>;

export const notifyRequestSchema = z.object({ channel: z.enum(["sms", "email"]).default("sms") });

export const presaleCodeRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,16}$/, { error: "Codes are 4–16 letters or numbers" }),
});
export type PresaleCodeRequest = z.input<typeof presaleCodeRequestSchema>;

export const alertSchema = z.object({
  id: idSchema,
  tone: z.enum(["warning", "info", "danger"]),
  title: z.string(),
  body: z.string(),
  action: z.object({ label: z.string(), href: z.string() }).optional(),
});
export type Alert = z.infer<typeof alertSchema>;
