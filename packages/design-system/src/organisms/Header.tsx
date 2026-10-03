import { notificationSchema } from "@repo/contracts";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { LinkButton } from "../atoms/Button";
import { Avatar, Logo } from "../atoms/Identity";
import { Thumbnail } from "../atoms/Media";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { validateProps, zClassName, zFn, zHref, zNode } from "../lib/props";
import { useUI } from "../lib/provider";
import { cn } from "../lib/utils";

const navLinkSchema = z.object({ id: z.string().min(1), label: z.string().min(1), href: zHref });

const accountMenuSchema = z.object({
  links: z.array(z.object({ label: z.string().min(1), href: zHref })),
  onSignOut: zFn<() => void>(),
});

const accountSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("signed_in"),
    initials: z.string().min(1).max(3),
    avatarUrl: z.string().min(1).optional(),
    name: z.string().min(1),
    href: zHref,
    /** With a menu the avatar opens a dropdown (account links + sign out) instead of linking to `href`. */
    menu: accountMenuSchema.optional(),
  }),
  z.object({ status: z.literal("signed_out"), signInHref: zHref, cta: z.object({ label: z.string().min(1), href: zHref }).optional() }),
  z.object({ status: z.literal("loading") }),
]);

export const siteHeaderPropsSchema = z.object({
  links: z.array(navLinkSchema),
  activeId: z.string().optional(),
  account: accountSchema,
  homeHref: zHref.optional(),
  languageToggle: z.object({ label: z.string().min(1), glyph: z.string().min(1), onToggle: zFn<() => void>() }).optional(),
  /** Rendered beside the account avatar — typically a NotificationBell. */
  notifications: zNode.optional(),
  className: zClassName,
});

export type SiteHeaderProps = z.input<typeof siteHeaderPropsSchema>;

/** Organism · SiteHeader — primary navigation with account state and a mobile menu. */
export function SiteHeader(props: SiteHeaderProps) {
  validateProps("SiteHeader", siteHeaderPropsSchema, props);
  const { links, activeId, account, homeHref = "/", languageToggle, notifications, className } = props;
  const { LinkComponent, t, dir } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);

  const accountArea =
    account.status === "signed_in" && account.menu ? (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("Account menu: {name}", { name: account.name })}
          className="flex h-11 shrink-0 items-center gap-1 rounded-full pe-1 focus-visible:ring-[3px] focus-visible:ring-gold focus-visible:outline-none"
        >
          <Avatar initials={account.initials} src={account.avatarUrl} size="md" />
          <ChevronDown className="hidden size-4 text-sub sm:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 border-line bg-white p-1.5">
          <DropdownMenuLabel className="flex flex-col px-2.5 py-2">
            <span className="text-[15px] font-semibold">{account.name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-line" />
          {account.menu.links.map((link) => (
            <DropdownMenuItem key={link.href} asChild className="min-h-11 cursor-pointer px-2.5 text-[15px] focus:bg-paper">
              <LinkComponent href={link.href}>{link.label}</LinkComponent>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-line" />
          <DropdownMenuItem onSelect={account.menu.onSignOut} className="min-h-11 cursor-pointer px-2.5 text-[15px] focus:bg-paper">
            <LogOut aria-hidden="true" /> {t("Sign out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : account.status === "signed_in" ? (
      <LinkComponent
        href={account.href}
        aria-label={t("Account: {name}", { name: account.name })}
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <Avatar initials={account.initials} src={account.avatarUrl} size="md" />
      </LinkComponent>
    ) : account.status === "signed_out" ? (
      <div className="flex shrink-0 items-center gap-2">
        <LinkButton href={account.signInHref} variant="outline" size="md" className="font-medium">
          {t("Sign in")}
        </LinkButton>
        {account.cta ? (
          <LinkButton href={account.cta.href} variant="primary" size="md" className="hidden sm:inline-flex">
            {account.cta.label}
          </LinkButton>
        ) : null}
      </div>
    ) : (
      <span className="size-11 shrink-0 animate-pulse rounded-full bg-sand" aria-hidden="true" />
    );

  return (
    <header className={cn("border-b border-line bg-white text-ink", className)}>
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-4 px-4 sm:px-8 lg:gap-7">
        <LinkComponent href={homeHref} aria-label={t("Matchpass home")} className="shrink-0">
          <Logo />
        </LinkComponent>
        <nav aria-label={t("Main")} className="hidden h-full flex-1 lg:block">
          <ul className="m-0 flex h-full list-none gap-6 p-0 text-[15px] font-medium">
            {links.map((link) => {
              const active = link.id === activeId;
              return (
                <li key={link.id} className="flex">
                  <LinkComponent
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center border-b-2 pt-0.5",
                      active ? "border-pitch text-pitch" : "border-transparent hover:text-pitch",
                    )}
                  >
                    {link.label}
                  </LinkComponent>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-2 sm:gap-3 lg:ms-0">
          {languageToggle ? (
            <button
              type="button"
              aria-label={languageToggle.label}
              onClick={languageToggle.onToggle}
              className="h-11 min-w-11 rounded-lg border border-line bg-white text-base"
            >
              {languageToggle.glyph}
            </button>
          ) : null}
          {account.status === "signed_in" ? notifications : null}
          {accountArea}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("Open menu")}
                className="flex size-11 items-center justify-center rounded-lg border border-line lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-[300px] bg-white">
              <SheetHeader>
                <SheetTitle>
                  <Logo size="sm" />
                </SheetTitle>
                <SheetDescription className="sr-only">{t("Site navigation")}</SheetDescription>
              </SheetHeader>
              <nav aria-label={t("Mobile")} className="px-4">
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {links.map((link) => (
                    <li key={link.id}>
                      <LinkComponent
                        href={link.href}
                        aria-current={link.id === activeId ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex min-h-12 items-center rounded-lg px-3 text-base font-medium",
                          link.id === activeId ? "bg-mint text-pitch" : "hover:bg-paper",
                        )}
                      >
                        {link.label}
                      </LinkComponent>
                    </li>
                  ))}
                  {account.status === "signed_in" && account.menu ? (
                    <>
                      <li className="mt-3 border-t border-line px-3 pt-4 pb-1 text-sm font-semibold text-sub">{account.name}</li>
                      {account.menu.links.map((link) => (
                        <li key={link.href}>
                          <LinkComponent
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-paper"
                          >
                            {link.label}
                          </LinkComponent>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            account.menu?.onSignOut();
                          }}
                          className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-start text-base font-medium hover:bg-paper"
                        >
                          <LogOut className="size-4" aria-hidden="true" /> {t("Sign out")}
                        </button>
                      </li>
                    </>
                  ) : null}
                  {account.status === "signed_out" && account.cta ? (
                    <li className="pt-3">
                      <LinkButton href={account.cta.href} variant="primary" block size="lg">
                        {account.cta.label}
                      </LinkButton>
                    </li>
                  ) : null}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* ---------- NotificationBell ---------- */

export const notificationBellPropsSchema = z.object({
  items: z.array(notificationSchema),
  unread: z.number().int().nonnegative(),
  onMarkAllRead: zFn<() => void>().optional(),
  /** Called when the panel opens (e.g. to refresh). */
  onOpenChange: zFn<(open: boolean) => void>().optional(),
  allHref: zHref.optional(),
  className: zClassName,
});

export type NotificationBellProps = z.input<typeof notificationBellPropsSchema>;

/** Organism · NotificationBell — unread count and the latest updates (orders, transfers, refunds, events). */
export function NotificationBell(props: NotificationBellProps) {
  validateProps("NotificationBell", notificationBellPropsSchema, props);
  const { items, unread, onMarkAllRead, onOpenChange, allHref, className } = props;
  const { LinkComponent, t, f } = useUI();
  const [open, setOpen] = useState(false);
  const label = unread ? t("Notifications, {count} unread", { count: unread }) : t("Notifications");
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <PopoverTrigger
        aria-label={label}
        className={cn(
          "relative flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white focus-visible:ring-[3px] focus-visible:ring-gold focus-visible:outline-none",
          className,
        )}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -end-1 flex min-w-5 items-center justify-center rounded-full bg-rose-ink px-1 font-mono text-[11px] leading-5 font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] border-line bg-white p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">{t("Notifications")}</h2>
          {onMarkAllRead && unread ? (
            <button type="button" onClick={onMarkAllRead} className="min-h-11 text-sm font-semibold text-pitch underline">
              {t("Mark all as read")}
            </button>
          ) : null}
        </div>
        {items.length ? (
          <ul className="m-0 max-h-[420px] list-none overflow-y-auto p-0">
            {items.map((item) => {
              const text = (
                <>
                  <span className="flex items-start gap-2">
                    {!item.read ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-pitch" aria-label={t("Unread")} role="img" />
                    ) : null}
                    <span className={cn("text-[15px]", !item.read && "font-semibold")}>{item.title}</span>
                  </span>
                  <span className="text-sm text-sub">{item.body}</span>
                  <span className="font-mono text-xs text-muted-ink">{f.dateTimeLabel(item.createdAt)}</span>
                </>
              );
              const body = item.imageUrl ? (
                <span className="flex gap-3">
                  <Thumbnail src={item.imageUrl} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">{text}</span>
                </span>
              ) : (
                text
              );
              return (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  {item.href ? (
                    <LinkComponent href={item.href} onClick={() => setOpen(false)} className="flex flex-col gap-1 px-4 py-3 hover:bg-paper">
                      {body}
                    </LinkComponent>
                  ) : (
                    <div className="flex flex-col gap-1 px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-sub">{t("You’re all caught up.")}</p>
        )}
        {allHref ? (
          <div className="border-t border-line px-4 py-2 text-center">
            <LinkComponent
              href={allHref}
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-pitch underline"
            >
              {t("See all notifications")}
            </LinkComponent>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- MinimalHeader ---------- */

export const minimalHeaderPropsSchema = z.object({
  homeHref: zHref.optional(),
  tone: z.enum(["light", "dark"]).optional(),
  wordmark: z.enum(["display", "ticket"]).optional(),
  trailing: zNode.optional(),
  center: zNode.optional(),
  className: zClassName,
});

export type MinimalHeaderProps = z.input<typeof minimalHeaderPropsSchema>;

/** Organism · MinimalHeader — logo-only header for focused flows (queue, seats, refunds). */
export function MinimalHeader(props: MinimalHeaderProps) {
  validateProps("MinimalHeader", minimalHeaderPropsSchema, props);
  const { homeHref = "/", tone = "light", wordmark = "display", trailing, center, className } = props;
  const { LinkComponent, t } = useUI();
  return (
    <header className={cn(tone === "light" ? "border-b border-line bg-white text-ink" : "bg-transparent text-white", className)}>
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center justify-between gap-x-7 gap-y-2 px-4 py-2 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
          <LinkComponent href={homeHref} aria-label={t("Matchpass home")}>
            <Logo tone={tone === "dark" ? "inverse" : "default"} wordmark={wordmark} size={wordmark === "ticket" ? "md" : "md"} />
          </LinkComponent>
          {center}
        </div>
        {trailing}
      </div>
    </header>
  );
}

/* ---------- SiteFooter ---------- */

export const siteFooterPropsSchema = z.object({
  tagline: z.string().min(1),
  columns: z.array(z.object({ title: z.string().min(1), links: z.array(z.object({ label: z.string().min(1), href: zHref })) })).min(1),
  legal: z.string().optional(),
  className: zClassName,
});

export type SiteFooterProps = z.input<typeof siteFooterPropsSchema>;

/** Organism · SiteFooter */
export function SiteFooter(props: SiteFooterProps) {
  validateProps("SiteFooter", siteFooterPropsSchema, props);
  const { tagline, columns, legal, className } = props;
  const { LinkComponent } = useUI();
  return (
    <footer className={cn("mt-14 bg-ink text-ash", className)}>
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 px-4 py-12 text-sm sm:px-8">
        <div className="flex flex-col gap-2.5">
          <Logo tone="inverse" wordmark="display" />
          <p className="leading-normal">{tagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold text-white">{column.title}</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {column.links.map((link) => (
                <li key={link.label}>
                  <LinkComponent href={link.href} className="hover:text-white hover:underline">
                    {link.label}
                  </LinkComponent>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      {legal ? <p className="mx-auto max-w-[1280px] px-4 pb-8 text-xs sm:px-8">{legal}</p> : null}
    </footer>
  );
}
