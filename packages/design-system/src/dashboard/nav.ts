import { msg } from "@repo/i18n";
import { can, type StaffPermission, type StaffRole } from "@repo/contracts";
import {
  Building2,
  CalendarDays,
  IdCard,
  Inbox,
  LayoutDashboard,
  Receipt,
  ScanLine,
  ScrollText,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type StaffNavId =
  "overview" | "events" | "orders" | "fans" | "fan-ids" | "refunds" | "entry" | "requests" | "organizers" | "payouts" | "audit";

export type StaffNavItem = { id: StaffNavId; href: string; label: string; icon: LucideIcon; group: "monitor" | "desk" | "business" };

type Rule = StaffNavItem & { allowed: (role: StaffRole) => boolean };
const needs = (permission: StaffPermission) => (role: StaffRole) => can(role, permission);

const RULES: Rule[] = [
  { id: "overview", href: "/", label: msg("Overview"), icon: LayoutDashboard, group: "monitor", allowed: needs("overview:read") },
  { id: "events", href: "/events", label: msg("Events"), icon: CalendarDays, group: "monitor", allowed: needs("events:read") },
  { id: "orders", href: "/orders", label: msg("Orders"), icon: Receipt, group: "monitor", allowed: needs("orders:read") },
  { id: "entry", href: "/entry", label: msg("Entry"), icon: ScanLine, group: "monitor", allowed: needs("entry:read") },
  { id: "fan-ids", href: "/fan-ids", label: msg("Fan ID reviews"), icon: IdCard, group: "desk", allowed: needs("fanid:review") },
  { id: "refunds", href: "/refunds", label: msg("Refunds"), icon: Undo2, group: "desk", allowed: needs("refunds:review") },
  { id: "fans", href: "/fans", label: msg("Fans"), icon: Users, group: "desk", allowed: needs("users:read") },
  {
    id: "requests",
    href: "/requests",
    label: msg("Change requests"),
    icon: Inbox,
    group: "business",
    allowed: (role) => can(role, "requests:review") || can(role, "events:request"),
  },
  {
    id: "organizers",
    href: "/organizers",
    label: msg("Organisers"),
    icon: Building2,
    group: "business",
    allowed: needs("organizers:read"),
  },
  { id: "payouts", href: "/payouts", label: msg("Payouts"), icon: Wallet, group: "business", allowed: needs("payouts:read") },
  { id: "audit", href: "/audit", label: msg("Audit log"), icon: ScrollText, group: "business", allowed: needs("audit:read") },
];

export const STAFF_NAV_GROUPS = { monitor: msg("Monitor"), desk: msg("Fan desk"), business: msg("Business") } as const;

/** The dashboard sections a role may open, in menu order. Mirrors the API's permission checks. */
export function staffNavFor(role: StaffRole): StaffNavItem[] {
  return RULES.filter((rule) => rule.allowed(role)).map(({ allowed: _allowed, ...item }) => item);
}

/** Which section a dashboard path belongs to (`/events/abc` → events). */
export function staffNavIdOf(path: string): StaffNavId | undefined {
  const first = path.replace(/^\/(en|ar)(?=\/|$)/, "").split("/")[1] ?? "";
  if (first === "") return "overview";
  return RULES.find((r) => r.href === `/${first}`)?.id;
}

export const staffRoleLabels: Record<StaffRole, string> = {
  admin: msg("Admin"),
  operations: msg("Operations"),
  organizer: msg("Organiser"),
};
