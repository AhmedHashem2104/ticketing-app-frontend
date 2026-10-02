import {
  alertSchema,
  eventSummarySchema,
  formatMoney,
  notificationSchema,
  refundSchema,
  resaleListingSchema,
  resaleOfferSchema,
  ticketSchema,
  type ResaleOffer,
  type Ticket,
} from "@repo/contracts";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Button, LinkButton } from "../atoms/Button";
import { Skeleton } from "../atoms/Feedback";
import { Heading } from "../atoms/Typography";
import { EmptyState, ErrorState, Notice } from "../molecules/Content";
import { SegmentedNav, segmentedNavPropsSchema } from "../molecules/Navigation";
import {
  AccountProfileCard,
  accountProfileCardPropsSchema,
  BrandPanel,
  brandPanelPropsSchema,
  ForgotPasswordForm,
  forgotPasswordFormPropsSchema,
  LinkedFansManager,
  linkedFansManagerPropsSchema,
  PreferencesForm,
  preferencesFormPropsSchema,
  FanIdWizard,
  fanIdWizardPropsSchema,
  LoginForm,
  loginFormPropsSchema,
  OtpForm,
  otpFormPropsSchema,
  SignUpForm,
  signUpFormPropsSchema,
} from "../organisms/Account";
import { MinimalHeader } from "../organisms/Header";
import {
  RefundPolicyCards,
  refundPolicyCardsPropsSchema,
  RefundStatusCard,
  RefundWizard,
  refundWizardPropsSchema,
} from "../organisms/Refunds";
import { ListingsCard, ResaleForm, resaleFormPropsSchema, ResaleInfoPanel } from "../organisms/Resale";
import {
  StubTicket,
  TicketActions,
  TicketDetailPanel,
  TicketListItem,
  ticketDetailPanelPropsSchema,
  TransfersCard,
  transfersCardPropsSchema,
} from "../organisms/Tickets";
import { dateTimeLabel } from "../lib/datetime";
import { validateProps, zFn, zHref, zNode } from "../lib/props";
import { cn } from "../lib/utils";
import { Container, SiteLayout, SplitLayout, TwoColumn } from "../templates/Layouts";

const statusSchema = z.enum(["loading", "error", "success"]);
const navSchema = segmentedNavPropsSchema.shape.items;

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[284px] max-w-[880px]" rounded="xl" />
      ))}
    </div>
  );
}

/* ---------- MyTicketsPage ---------- */

export const myTicketsPagePropsSchema = z.object({
  header: zNode,
  nav: navSchema,
  alerts: z.array(alertSchema),
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  tickets: z.array(ticketSchema),
  showQrHref: zFn<(ticket: Ticket) => string>(),
  transferHref: zFn<(ticket: Ticket) => string>().optional(),
  resaleHref: zFn<(ticket: Ticket) => string>().optional(),
  refundHref: zFn<(ticket: Ticket) => string>().optional(),
  onAddToWallet: zFn<(ticket: Ticket) => void>().optional(),
  onCancelTransfer: zFn<(ticket: Ticket) => void>().optional(),
  browseHref: zHref,
});

export type MyTicketsPageProps = z.input<typeof myTicketsPagePropsSchema>;

/** Page · My tickets — stub tickets with actions and alerts. */
export function MyTicketsPage(props: MyTicketsPageProps) {
  validateProps("MyTicketsPage", myTicketsPagePropsSchema, props);
  const {
    header,
    nav,
    alerts,
    status,
    onRetry,
    tickets,
    showQrHref,
    transferHref,
    resaleHref,
    refundHref,
    onAddToWallet,
    onCancelTransfer,
    browseHref,
  } = props;
  return (
    <SiteLayout header={header}>
      <Container className="flex flex-col gap-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <Heading as="h1" font="ticket" size="3xl">
            My tickets
          </Heading>
          <SegmentedNav label="Ticket lists" items={nav} />
        </div>
        {alerts.map((alert) => (
          <Notice
            key={alert.id}
            tone={alert.tone === "danger" ? "danger" : alert.tone === "info" ? "info" : "warning"}
            title={alert.title}
            action={
              alert.action ? (
                <LinkButton href={alert.action.href} variant="outline-warning" size="md">
                  {alert.action.label}
                </LinkButton>
              ) : undefined
            }
          >
            {alert.body}
          </Notice>
        ))}
        {status === "loading" ? (
          <ListSkeleton />
        ) : status === "error" ? (
          <ErrorState message="We couldn't load your tickets." onRetry={onRetry} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No upcoming tickets"
            action={
              <LinkButton href={browseHref} variant="primary" size="lg">
                Browse events
              </LinkButton>
            }
          >
            Tickets you buy or receive appear here.
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex flex-wrap items-center gap-5">
                <StubTicket ticket={ticket} className="shrink-0" />
                <TicketActions
                  ticket={ticket}
                  showQrHref={showQrHref(ticket)}
                  transferHref={transferHref?.(ticket)}
                  resaleHref={resaleHref?.(ticket)}
                  refundHref={refundHref?.(ticket)}
                  onAddToWallet={onAddToWallet ? () => onAddToWallet(ticket) : undefined}
                  onCancelTransfer={onCancelTransfer ? () => onCancelTransfer(ticket) : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </SiteLayout>
  );
}

/* ---------- TicketWalletPage ---------- */

export const ticketWalletPagePropsSchema = z.object({
  header: zNode,
  groups: z.array(z.object({ key: z.string().min(1), tickets: z.array(ticketSchema).min(1) })).min(1),
  selectedKey: z.string().min(1),
  onSelect: zFn<(key: string) => void>(),
  index: z.number().int().min(0),
  onIndexChange: zFn<(index: number) => void>(),
  transfer: ticketDetailPanelPropsSchema.shape.transfer,
  qr: ticketDetailPanelPropsSchema.shape.qr,
  onCancelTransfer: zFn<(ticket: Ticket) => void>().optional(),
  resaleHref: zFn<(ticket: Ticket) => string>().optional(),
  onAddToWallet: zFn<(ticket: Ticket) => void>().optional(),
  backHref: zHref,
});

export type TicketWalletPageProps = z.input<typeof ticketWalletPagePropsSchema>;

/** Page · Ticket QR & transfer. */
export function TicketWalletPage(props: TicketWalletPageProps) {
  validateProps("TicketWalletPage", ticketWalletPagePropsSchema, props);
  const {
    header,
    groups,
    selectedKey,
    onSelect,
    index,
    onIndexChange,
    transfer,
    qr,
    onCancelTransfer,
    resaleHref,
    onAddToWallet,
    backHref,
  } = props;
  const group = groups.find((g) => g.key === selectedKey) ?? groups[0]!;
  const i = Math.min(index, group.tickets.length - 1);
  const ticket = group.tickets[i]!;
  return (
    <SiteLayout header={header}>
      <Container className="flex flex-col gap-[22px] pt-8">
        <AppLink href={backHref} tone="pitch" className="flex min-h-11 items-center self-start text-sm">
          ← My tickets
        </AppLink>
        <Heading as="h1" size="3xl">
          Ticket QR
        </Heading>
        <div className="flex flex-wrap items-start gap-7">
          <section aria-label="Your events" className="flex w-full min-w-[min(100%,280px)] flex-[0_1_380px] flex-col gap-2.5">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {groups.map((g) => (
                <li key={g.key}>
                  <TicketListItem
                    ticket={g.tickets[0]!}
                    countLabel={`${g.tickets.length} ticket${g.tickets.length === 1 ? "" : "s"}`}
                    selected={g.key === group.key}
                    onSelect={() => onSelect(g.key)}
                  />
                </li>
              ))}
            </ul>
          </section>
          <TicketDetailPanel
            className="min-w-[min(100%,320px)] flex-[1_1_560px]"
            ticket={ticket}
            position={{ index: i + 1, of: group.tickets.length }}
            onPrevious={() => onIndexChange(Math.max(0, i - 1))}
            onNext={() => onIndexChange(Math.min(group.tickets.length - 1, i + 1))}
            onAddToWallet={onAddToWallet ? () => onAddToWallet(ticket) : undefined}
            resaleHref={resaleHref?.(ticket)}
            transfer={transfer}
            qr={qr}
            onCancelTransfer={onCancelTransfer ? () => onCancelTransfer(ticket) : undefined}
          />
        </div>
      </Container>
    </SiteLayout>
  );
}

/* ---------- ResalePage ---------- */

export const resalePagePropsSchema = z.object({
  header: zNode,
  backHref: zHref,
  form: resaleFormPropsSchema
    .omit({ className: true, tickets: true })
    .extend({ tickets: z.array(resaleFormPropsSchema.shape.tickets.element) }),
  success: z.string().optional(),
  listings: z.array(resaleListingSchema),
  onWithdraw: zFn<(id: string) => void>().optional(),
  withdrawingId: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1),
  browseHref: zHref,
});

export type ResalePageProps = z.input<typeof resalePagePropsSchema>;

/** Page · Sell on official resale. */
export function ResalePage(props: ResalePageProps) {
  validateProps("ResalePage", resalePagePropsSchema, props);
  const { header, backHref, form, success, listings, onWithdraw, withdrawingId, steps, browseHref } = props;
  return (
    <SiteLayout header={header}>
      <Container className="pt-8">
        <TwoColumn
          asideOffset
          sticky={false}
          asideLabel="About resale"
          aside={
            <>
              <ResaleInfoPanel steps={steps} />
              <ListingsCard listings={listings} onWithdraw={onWithdraw} withdrawingId={withdrawingId} />
            </>
          }
        >
          <AppLink href={backHref} tone="pitch" className="-mb-2 flex min-h-11 items-center self-start text-sm">
            ← My tickets
          </AppLink>
          <Heading as="h1" size="3xl">
            Sell your ticket
          </Heading>
          {success ? <Notice tone="success">{success}</Notice> : null}
          {form.tickets.length ? (
            <ResaleForm key={form.tickets.map((t) => t.id).join()} {...form} />
          ) : (
            <EmptyState
              title="No tickets you can resell"
              action={
                <LinkButton href={browseHref} variant="primary" size="lg">
                  Browse events
                </LinkButton>
              }
            >
              Match and concert tickets can be listed up to 6 hours before the event.
            </EmptyState>
          )}
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- RefundRequestPage ---------- */

export const refundRequestPagePropsSchema = z.object({ backHref: zHref, wizard: refundWizardPropsSchema.omit({ className: true }) });
export type RefundRequestPageProps = z.input<typeof refundRequestPagePropsSchema>;

/** Page · Request a refund. */
export function RefundRequestPage(props: RefundRequestPageProps) {
  validateProps("RefundRequestPage", refundRequestPagePropsSchema, props);
  const { backHref, wizard } = props;
  return (
    <SiteLayout
      header={
        <MinimalHeader
          wordmark="ticket"
          trailing={
            <AppLink href={backHref} tone="pitch" className="flex min-h-11 items-center text-sm">
              ← Back to my tickets
            </AppLink>
          }
        />
      }
    >
      <Container className="pt-8">
        <RefundWizard {...wizard} />
      </Container>
    </SiteLayout>
  );
}

/* ---------- RefundsPage ---------- */

export const refundsPagePropsSchema = z.object({
  header: zNode,
  nav: navSchema,
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  refunds: z.array(refundSchema),
  onCancel: zFn<(id: string) => void>(),
  cancellingId: z.string().optional(),
  onSecondary: zFn<(id: string) => void>().optional(),
  policies: refundPolicyCardsPropsSchema.shape.policies,
});

export type RefundsPageProps = z.input<typeof refundsPagePropsSchema>;

/** Page · Refund status. */
export function RefundsPage(props: RefundsPageProps) {
  validateProps("RefundsPage", refundsPagePropsSchema, props);
  const { header, nav, status, onRetry, refunds, onCancel, cancellingId, onSecondary, policies } = props;
  return (
    <SiteLayout header={header}>
      <Container className="flex flex-col gap-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <Heading as="h1" font="ticket" size="3xl">
            Refunds
          </Heading>
          <SegmentedNav label="Ticket lists" items={nav} />
        </div>
        {status === "loading" ? (
          <ListSkeleton />
        ) : status === "error" ? (
          <ErrorState message="We couldn't load your refunds." onRetry={onRetry} />
        ) : refunds.length === 0 ? (
          <EmptyState title="No refunds yet">Refund requests you make appear here with their progress.</EmptyState>
        ) : (
          refunds.map((refund) => (
            <RefundStatusCard
              key={refund.id}
              refund={refund}
              onCancel={onCancel}
              cancelling={cancellingId === refund.id}
              onSecondary={onSecondary}
            />
          ))
        )}
        <RefundPolicyCards policies={policies} />
      </Container>
    </SiteLayout>
  );
}

/* ---------- Auth pages ---------- */

export const signUpPagePropsSchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("details"),
    brand: brandPanelPropsSchema.omit({ className: true }),
    topRight: zNode.optional(),
    signUp: signUpFormPropsSchema.omit({ className: true }),
  }),
  z.object({
    stage: z.literal("otp"),
    brand: brandPanelPropsSchema.omit({ className: true }),
    topRight: zNode.optional(),
    otp: otpFormPropsSchema.omit({ className: true }),
  }),
]);

export type SignUpPageProps = z.input<typeof signUpPagePropsSchema>;

/** Page · Sign up & OTP. */
export function SignUpPage(props: SignUpPageProps) {
  validateProps("SignUpPage", signUpPagePropsSchema, props);
  return (
    <SplitLayout panel={<BrandPanel {...props.brand} className="min-h-full" />} topRight={props.topRight}>
      {props.stage === "details" ? <SignUpForm {...props.signUp} /> : <OtpForm {...props.otp} />}
    </SplitLayout>
  );
}

export const loginPagePropsSchema = z.object({
  brand: brandPanelPropsSchema.omit({ className: true }),
  topRight: zNode.optional(),
  login: loginFormPropsSchema.omit({ className: true }),
  notice: z.string().optional(),
});
export type LoginPageProps = z.input<typeof loginPagePropsSchema>;

/** Page · Log in. */
export function LoginPage(props: LoginPageProps) {
  validateProps("LoginPage", loginPagePropsSchema, props);
  const { brand, topRight, login, notice } = props;
  return (
    <SplitLayout panel={<BrandPanel {...brand} className="min-h-full" />} topRight={topRight}>
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      <LoginForm {...login} />
    </SplitLayout>
  );
}

export const fanIdPagePropsSchema = z.object({ header: zNode, wizard: fanIdWizardPropsSchema.omit({ className: true }) });
export type FanIdPageProps = z.input<typeof fanIdPagePropsSchema>;

/** Page · Fan ID verification. */
export function FanIdPage(props: FanIdPageProps) {
  validateProps("FanIdPage", fanIdPagePropsSchema, props);
  return (
    <SiteLayout header={props.header}>
      <Container width="narrow" className="pt-8">
        <FanIdWizard {...props.wizard} />
      </Container>
    </SiteLayout>
  );
}

/* ---------- MessagePage ---------- */

export const messagePagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  code: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  action: z.object({ label: z.string().min(1), href: zHref }).optional(),
});

export type MessagePageProps = z.input<typeof messagePagePropsSchema>;

/** Page · Message — not found, feature unavailable, generic errors. */
export function MessagePage(props: MessagePageProps) {
  validateProps("MessagePage", messagePagePropsSchema, props);
  const { header, footer, code, title, body, action } = props;
  return (
    <SiteLayout header={header} footer={footer}>
      <Container width="focus" className="flex flex-col items-center gap-4 pt-20 text-center">
        {code ? <span className="font-mono text-sm text-muted-ink">{code}</span> : null}
        <Heading as="h1" size="3xl">
          {title}
        </Heading>
        <p className="max-w-md text-base text-sub">{body}</p>
        {action ? (
          <LinkButton href={action.href} variant="primary" size="xl">
            {action.label}
          </LinkButton>
        ) : null}
      </Container>
    </SiteLayout>
  );
}

/* ---------- ForgotPasswordPage ---------- */

export const forgotPasswordPagePropsSchema = z.object({
  brand: brandPanelPropsSchema.omit({ className: true }),
  topRight: zNode.optional(),
  form: forgotPasswordFormPropsSchema.omit({ className: true }),
});
export type ForgotPasswordPageProps = z.input<typeof forgotPasswordPagePropsSchema>;

/** Page · Forgot password. */
export function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  validateProps("ForgotPasswordPage", forgotPasswordPagePropsSchema, props);
  const { brand, topRight, form } = props;
  return (
    <SplitLayout panel={<BrandPanel {...brand} className="min-h-full" />} topRight={topRight}>
      <ForgotPasswordForm {...form} />
    </SplitLayout>
  );
}

/* ---------- AccountPage ---------- */

export const accountPagePropsSchema = z.object({
  header: zNode,
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  profile: accountProfileCardPropsSchema.omit({ className: true }).optional(),
  preferences: preferencesFormPropsSchema.omit({ className: true }).optional(),
  fans: linkedFansManagerPropsSchema.omit({ className: true }).optional(),
  links: z.array(z.object({ label: z.string().min(1), description: z.string().min(1), href: zHref })),
});
export type AccountPageProps = z.input<typeof accountPagePropsSchema>;

/** Page · Account — profile, linked fans, notification preferences and shortcuts. */
export function AccountPage(props: AccountPageProps) {
  validateProps("AccountPage", accountPagePropsSchema, props);
  const { header, status, onRetry, profile, preferences, fans, links } = props;
  return (
    <SiteLayout header={header}>
      <Container className="flex flex-col gap-6 pt-8">
        <Heading as="h1" size="3xl">
          Your account
        </Heading>
        {status === "loading" ? (
          <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
            <Skeleton className="h-[220px]" rounded="xl" />
            <Skeleton className="h-[220px]" rounded="xl" />
          </div>
        ) : status === "error" || !profile ? (
          <ErrorState message="We couldn't load your account." onRetry={onRetry} />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <AccountProfileCard {...profile} />
              <nav aria-label="Account shortcuts" className="rounded-2xl border border-line bg-white p-2">
                <ul className="m-0 flex list-none flex-col p-0">
                  {links.map((link) => (
                    <li key={link.href}>
                      <AppLink
                        href={link.href}
                        className="flex min-h-14 flex-col justify-center rounded-xl px-3.5 py-2 hover:bg-paper hover:no-underline"
                      >
                        <span className="text-[15px] font-semibold">{link.label}</span>
                        <span className="text-sm text-sub">{link.description}</span>
                      </AppLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex flex-col gap-5">
              {fans ? <LinkedFansManager {...fans} /> : null}
              {preferences ? <PreferencesForm {...preferences} /> : null}
            </div>
          </div>
        )}
      </Container>
    </SiteLayout>
  );
}

/* ---------- TransfersPage ---------- */

export const transfersPagePropsSchema = z.object({
  header: zNode,
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  incoming: transfersCardPropsSchema.omit({ className: true, title: true, emptyLabel: true }),
  outgoing: transfersCardPropsSchema.omit({ className: true, title: true, emptyLabel: true }),
  message: z.object({ tone: z.enum(["success", "danger"]), text: z.string().min(1) }).optional(),
  backHref: zHref,
});
export type TransfersPageProps = z.input<typeof transfersPagePropsSchema>;

/** Page · Transfers — accept tickets sent to you and follow the ones you sent. */
export function TransfersPage(props: TransfersPageProps) {
  validateProps("TransfersPage", transfersPagePropsSchema, props);
  const { header, status, onRetry, incoming, outgoing, message, backHref } = props;
  return (
    <SiteLayout header={header}>
      <Container width="narrow" className="flex flex-col gap-5 pt-8">
        <AppLink href={backHref} tone="pitch" className="flex min-h-11 items-center self-start text-sm">
          ← My tickets
        </AppLink>
        <Heading as="h1" size="3xl">
          Ticket transfers
        </Heading>
        {message ? (
          <Notice tone={message.tone} live="polite">
            {message.text}
          </Notice>
        ) : null}
        {status === "loading" ? (
          <Skeleton className="h-[200px]" rounded="xl" />
        ) : status === "error" ? (
          <ErrorState message="We couldn't load your transfers." onRetry={onRetry} />
        ) : (
          <>
            <TransfersCard {...incoming} title="Sent to you" emptyLabel="Nobody has sent you a ticket." />
            <TransfersCard {...outgoing} title="Sent by you" emptyLabel="You haven't sent any tickets." />
          </>
        )}
      </Container>
    </SiteLayout>
  );
}

/* ---------- NotificationsPage ---------- */

export const notificationsPagePropsSchema = z.object({
  header: zNode,
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  items: z.array(notificationSchema),
  onMarkAllRead: zFn<() => void>().optional(),
});
export type NotificationsPageProps = z.input<typeof notificationsPagePropsSchema>;

/** Page · Notifications. */
export function NotificationsPage(props: NotificationsPageProps) {
  validateProps("NotificationsPage", notificationsPagePropsSchema, props);
  const { header, status, onRetry, items, onMarkAllRead } = props;
  const unread = items.filter((n) => !n.read).length;
  return (
    <SiteLayout header={header}>
      <Container width="narrow" className="flex flex-col gap-5 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Heading as="h1" size="3xl">
            Notifications
          </Heading>
          {onMarkAllRead && unread ? (
            <Button variant="outline" onClick={onMarkAllRead}>
              Mark all as read
            </Button>
          ) : null}
        </div>
        {status === "loading" ? (
          <Skeleton className="h-[240px]" rounded="xl" />
        ) : status === "error" ? (
          <ErrorState message="We couldn't load your notifications." onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyState title="You're all caught up">Order, transfer, refund and event updates appear here.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 border-b border-line px-5 py-4 last:border-b-0">
                <span className={cn("text-[15px]", !item.read && "font-semibold")}>
                  {!item.read ? <span className="sr-only">Unread: </span> : null}
                  {item.href ? (
                    <AppLink href={item.href} underline>
                      {item.title}
                    </AppLink>
                  ) : (
                    item.title
                  )}
                </span>
                <span className="text-sm text-sub">{item.body}</span>
                <span className="font-mono text-xs text-muted-ink">{dateTimeLabel(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </SiteLayout>
  );
}

/* ---------- ResaleMarketPage ---------- */

export const resaleMarketPagePropsSchema = z.object({
  header: zNode,
  event: eventSummarySchema,
  status: statusSchema,
  onRetry: zFn<() => void>().optional(),
  offers: z.array(resaleOfferSchema),
  onBuy: zFn<(offer: ResaleOffer) => void>(),
  buyingId: z.string().optional(),
  serverError: z.string().optional(),
  /** Shown instead of buy buttons when the viewer still needs a Fan ID for a match. */
  fanIdHref: zHref.optional(),
  backHref: zHref,
});
export type ResaleMarketPageProps = z.input<typeof resaleMarketPagePropsSchema>;

/** Page · Official resale — fans selling tickets at or below face value. */
export function ResaleMarketPage(props: ResaleMarketPageProps) {
  validateProps("ResaleMarketPage", resaleMarketPagePropsSchema, props);
  const { header, event, status, onRetry, offers, onBuy, buyingId, serverError, fanIdHref, backHref } = props;
  return (
    <SiteLayout header={header}>
      <Container width="narrow" className="flex flex-col gap-5 pt-8">
        <AppLink href={backHref} tone="pitch" className="flex min-h-11 items-center self-start text-sm">
          ← {event.title}
        </AppLink>
        <div className="flex flex-col gap-1.5">
          <Heading as="h1" size="3xl">
            Official resale
          </Heading>
          <p className="text-[15px] text-sub">
            {event.title} · {dateTimeLabel(event.startsAt)} · {event.venue.name}. Fans sell at face value or less, and you get a brand-new
            ticket.
          </p>
        </div>
        {fanIdHref ? (
          <Notice
            tone="info"
            action={
              <LinkButton href={fanIdHref} variant="pitch" size="md">
                Get your Fan ID
              </LinkButton>
            }
          >
            Match tickets go to an approved Fan ID. Get yours first — it takes about 2 minutes.
          </Notice>
        ) : null}
        {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
        {status === "loading" ? (
          <Skeleton className="h-[200px]" rounded="xl" />
        ) : status === "error" ? (
          <ErrorState message="We couldn't load resale tickets." onRetry={onRetry} />
        ) : offers.length === 0 ? (
          <EmptyState title="No resale tickets right now">Fans list tickets all the time — check back closer to the day.</EmptyState>
        ) : (
          <ul
            aria-label="Resale tickets"
            className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0"
          >
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{offer.seatLabel}</span>
                  <span className="text-sm text-sub">
                    {offer.label}
                    {offer.price < offer.faceValue ? ` · face value ${formatMoney(offer.faceValue)}` : " · face value"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[26px] font-extrabold">{formatMoney(offer.price)}</span>
                  {fanIdHref ? null : (
                    <Button
                      variant="pitch"
                      onClick={() => onBuy(offer)}
                      loading={buyingId === offer.id}
                      disabled={!!buyingId && buyingId !== offer.id}
                      aria-label={`Buy ${offer.seatLabel} for ${formatMoney(offer.price)}`}
                    >
                      Buy
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </SiteLayout>
  );
}

/* ---------- InfoPage ---------- */

export const infoPagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  eyebrow: z.string().min(1).optional(),
  title: z.string().min(1),
  intro: z.string().min(1),
  updated: z.string().min(1).optional(),
  sections: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1) })).min(1),
  contact: z.object({ label: z.string().min(1), href: zHref }).optional(),
});
export type InfoPageProps = z.input<typeof infoPagePropsSchema>;

/** Page · Info — help, terms, privacy and policies with an in-page table of contents. */
export function InfoPage(props: InfoPageProps) {
  validateProps("InfoPage", infoPagePropsSchema, props);
  const { header, footer, eyebrow, title, intro, updated, sections, contact } = props;
  return (
    <SiteLayout header={header} footer={footer}>
      <Container className="flex flex-col gap-8 pt-10">
        <div className="flex max-w-[760px] flex-col gap-2">
          {eyebrow ? <span className="font-mono text-xs font-semibold tracking-[0.08em] text-pitch uppercase">{eyebrow}</span> : null}
          <Heading as="h1" size="3xl">
            {title}
          </Heading>
          <p className="text-[17px] leading-normal text-sub">{intro}</p>
          {updated ? <p className="text-sm text-muted-ink">Last updated {updated}</p> : null}
        </div>
        <div className="flex flex-wrap items-start gap-10">
          <nav aria-label="On this page" className="flex-[0_1_240px] lg:sticky lg:top-6">
            <h2 className="pb-2 text-sm font-semibold text-sub">On this page</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex min-h-11 items-center text-[15px] text-ink hover:text-pitch hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex max-w-[720px] min-w-[min(100%,320px)] flex-1 flex-col gap-8">
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
                <h2 id={`${s.id}-title`} className="text-xl font-semibold">
                  {s.title}
                </h2>
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="text-base leading-relaxed text-sub">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            {contact ? (
              <Notice
                tone="neutral"
                action={
                  <LinkButton href={contact.href} variant="outline" size="md">
                    {contact.label}
                  </LinkButton>
                }
              >
                Still need help? Our fan support team answers every day from 9:00 to 23:00.
              </Notice>
            ) : null}
          </div>
        </div>
      </Container>
    </SiteLayout>
  );
}
