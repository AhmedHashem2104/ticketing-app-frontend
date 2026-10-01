import { formatAmount, formatMoney, type Order } from "@repo/contracts";

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
const escapeIcs = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");

export type CalendarEvent = { id: string; title: string; startsAt: string; durationHours?: number; location: string; description?: string };

/** Builds an RFC 5545 calendar file for an event. */
export function buildIcs(event: CalendarEvent, now = new Date()) {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + (event.durationHours ?? 2.5) * 3_600_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Matchpass//Tickets//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@matchpass.app`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcs(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildReceipt(order: Order) {
  return [
    "MATCHPASS — RECEIPT",
    `Order ${order.reference}`,
    `${order.eventTitle}`,
    `${order.eventMeta}`,
    "",
    ...order.tickets.map((t) => `${t.holderName.padEnd(20)} ${t.seatLabel.padEnd(32)} ${formatAmount(t.price)}`),
    "",
    `${order.paymentLabel}`,
    `Total (incl. VAT): ${formatMoney(order.total)}`,
  ].join("\n");
}

/** Triggers a browser download for generated text content. */
export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
