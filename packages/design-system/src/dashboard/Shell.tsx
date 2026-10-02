import { staffUserSchema } from "@repo/contracts";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Avatar, Logo } from "../atoms/Identity";
import { Badge } from "../atoms/Badge";
import { Heading } from "../atoms/Typography";
import { useI18n, useUI } from "../lib/provider";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";
import { cn } from "../lib/utils";
import { STAFF_NAV_GROUPS, staffNavFor, staffNavIdOf, staffRoleLabels, type StaffNavItem } from "./nav";

/* ---------- DashboardShell ---------- */

export const dashboardShellPropsSchema = z.object({
  staff: staffUserSchema,
  /** The current path without the language prefix — highlights the open section. */
  currentPath: z.string().min(1),
  /** Waiting work per section, shown as a count beside it (Fan IDs to review…). */
  counts: z.record(z.string(), z.number().int().nonnegative()).optional(),
  /** Language switch (the app supplies it: it knows the routes). */
  languageSwitch: zNode.optional(),
  onSignOut: zFn<() => void>(),
  signingOut: z.boolean().optional(),
  children: zNode,
  className: zClassName,
});
export type DashboardShellProps = z.input<typeof dashboardShellPropsSchema>;

/**
 * Template · DashboardShell — the staff dashboard frame: a sidebar with the sections the signed-in role
 * may open (grouped, with waiting-work counts), a top bar with the person, their role and sign-out, and
 * the page. On small screens the sidebar folds into a menu button.
 */
export function DashboardShell(props: DashboardShellProps) {
  validateProps("DashboardShell", dashboardShellPropsSchema, props);
  const { staff, currentPath, counts = {}, languageSwitch, onSignOut, signingOut, children, className } = props;
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = staffNavFor(staff.role);
  const active = staffNavIdOf(currentPath);

  const nav = (
    <nav aria-label={t("Dashboard")} className="flex flex-col gap-5">
      {(Object.keys(STAFF_NAV_GROUPS) as (keyof typeof STAFF_NAV_GROUPS)[]).map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-semibold tracking-[0.12em] text-white/55 uppercase">{t(STAFF_NAV_GROUPS[group])}</p>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {groupItems.map((item) => (
                <li key={item.id}>
                  <NavLink item={item} active={item.id === active} count={counts[item.id]} onNavigate={() => setMenuOpen(false)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className={cn("min-h-dvh bg-paper lg:grid lg:grid-cols-[248px_minmax(0,1fr)]", className)}>
      <a
        href="#dashboard-main"
        className="sr-only z-50 rounded-md bg-gold px-3 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("Skip to content")}
      </a>
      <aside className="hidden bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-7 lg:overflow-y-auto lg:px-3 lg:py-6">
        <div className="flex flex-col gap-1 px-3">
          <Logo tone="inverse" size="sm" />
          <span className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">{t("Staff dashboard")}</span>
        </div>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="dashboard-menu"
            aria-label={menuOpen ? t("Close menu") : t("Open menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
          <span className="lg:hidden">
            <Logo size="sm" wordmark="none" />
          </span>
          <div className="ms-auto flex items-center gap-3">
            {languageSwitch}
            <div className="flex items-center gap-2.5">
              <Avatar initials={staff.initials} src={staff.avatarUrl} size="sm" />
              <span className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold">{staff.name}</span>
                <span className="text-[12px] text-muted-ink">
                  {staff.organizerName ? `${t(staffRoleLabels[staff.role])} · ${staff.organizerName}` : t(staffRoleLabels[staff.role])}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-paper disabled:opacity-60"
            >
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("Sign out")}</span>
            </button>
          </div>
        </header>
        {menuOpen ? (
          <div id="dashboard-menu" className="border-b border-line bg-ink px-3 py-5 text-white lg:hidden">
            {nav}
          </div>
        ) : null}
        <main id="dashboard-main" tabIndex={-1} className="flex min-w-0 flex-col gap-6 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ item, active, count, onNavigate }: { item: StaffNavItem; active: boolean; count?: number; onNavigate: () => void }) {
  const { LinkComponent, t } = useUI();
  const Icon = item.icon;
  return (
    <LinkComponent
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-white/80 no-underline hover:bg-white/10 hover:text-white",
        active && "bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-gold)] rtl:shadow-[inset_-3px_0_0_var(--color-gold)]",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="flex-1">{t(item.label)}</span>
      {count ? (
        <span className="min-w-6 rounded-full bg-gold px-1.5 text-center text-[12px] font-bold text-ink">
          {count}
          <span className="sr-only"> {t("waiting")}</span>
        </span>
      ) : null}
    </LinkComponent>
  );
}

/* ---------- PageHeader ---------- */

export const dashboardPageHeaderPropsSchema = z.object({
  title: z.string().min(1),
  description: zNode.optional(),
  eyebrow: zNode.optional(),
  actions: zNode.optional(),
  className: zClassName,
});
export type DashboardPageHeaderProps = z.input<typeof dashboardPageHeaderPropsSchema>;

/** Molecule · DashboardPageHeader — page title, one-line purpose and page-level actions. */
export function DashboardPageHeader(props: DashboardPageHeaderProps) {
  validateProps("DashboardPageHeader", dashboardPageHeaderPropsSchema, props);
  const { title, description, eyebrow, actions, className } = props;
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <div className="text-[13px] font-semibold text-muted-ink">{eyebrow}</div> : null}
        <Heading as="h1" size="xl">
          {title}
        </Heading>
        {description ? <p className="max-w-2xl text-[15px] text-muted-ink">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------- RoleBadge ---------- */

export const roleBadgePropsSchema = z.object({ role: staffUserSchema.shape.role, className: zClassName });
export type RoleBadgeProps = z.input<typeof roleBadgePropsSchema>;

/** Atom · RoleBadge — admin / operations / organiser pill. */
export function RoleBadge(props: RoleBadgeProps) {
  validateProps("RoleBadge", roleBadgePropsSchema, props);
  const { t } = useI18n();
  const tone = props.role === "admin" ? "inverse" : props.role === "operations" ? "info" : "gold";
  return (
    <Badge tone={tone} className={props.className}>
      {t(staffRoleLabels[props.role])}
    </Badge>
  );
}
