import { Menu } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { LinkButton } from "../atoms/Button";
import { Avatar, Logo } from "../atoms/Identity";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { validateProps, zClassName, zFn, zHref, zNode } from "../lib/props";
import { useUI } from "../lib/provider";
import { cn } from "../lib/utils";

const navLinkSchema = z.object({ id: z.string().min(1), label: z.string().min(1), href: zHref });

const accountSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("signed_in"), initials: z.string().min(1).max(3), name: z.string().min(1), href: zHref }),
  z.object({ status: z.literal("signed_out"), signInHref: zHref, cta: z.object({ label: z.string().min(1), href: zHref }).optional() }),
  z.object({ status: z.literal("loading") }),
]);

export const siteHeaderPropsSchema = z.object({
  links: z.array(navLinkSchema),
  activeId: z.string().optional(),
  account: accountSchema,
  homeHref: zHref.optional(),
  languageToggle: z.object({ label: z.string().min(1), glyph: z.string().min(1), onToggle: zFn<() => void>() }).optional(),
  className: zClassName,
});

export type SiteHeaderProps = z.input<typeof siteHeaderPropsSchema>;

/** Organism · SiteHeader — primary navigation with account state and a mobile menu. */
export function SiteHeader(props: SiteHeaderProps) {
  validateProps("SiteHeader", siteHeaderPropsSchema, props);
  const { links, activeId, account, homeHref = "/", languageToggle, className } = props;
  const { LinkComponent } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);

  const accountArea =
    account.status === "signed_in" ? (
      <LinkComponent
        href={account.href}
        aria-label={`Account: ${account.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <Avatar initials={account.initials} size="md" />
      </LinkComponent>
    ) : account.status === "signed_out" ? (
      <div className="flex shrink-0 items-center gap-2">
        <LinkButton href={account.signInHref} variant="outline" size="md" className="font-medium">
          Sign in
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
        <LinkComponent href={homeHref} aria-label="Matchpass home" className="shrink-0">
          <Logo />
        </LinkComponent>
        <nav aria-label="Main" className="hidden h-full flex-1 lg:block">
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
        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
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
          {accountArea}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex size-11 items-center justify-center rounded-lg border border-line lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-white">
              <SheetHeader>
                <SheetTitle>
                  <Logo size="sm" />
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="px-4">
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
  const { LinkComponent } = useUI();
  return (
    <header className={cn(tone === "light" ? "border-b border-line bg-white text-ink" : "bg-transparent text-white", className)}>
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center justify-between gap-x-7 gap-y-2 px-4 py-2 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
          <LinkComponent href={homeHref} aria-label="Matchpass home">
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
