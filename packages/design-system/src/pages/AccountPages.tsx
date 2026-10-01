import { alertSchema, refundSchema, resaleListingSchema, ticketSchema, type Ticket } from "@repo/contracts";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { LinkButton } from "../atoms/Button";
import { Skeleton } from "../atoms/Feedback";
import { Heading } from "../atoms/Typography";
import { EmptyState, ErrorState, Notice } from "../molecules/Content";
import { SegmentedNav, segmentedNavPropsSchema } from "../molecules/Navigation";
import {
  BrandPanel,
  brandPanelPropsSchema,
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
import { StubTicket, TicketActions, TicketDetailPanel, TicketListItem, ticketDetailPanelPropsSchema } from "../organisms/Tickets";
import { validateProps, zFn, zHref, zNode } from "../lib/props";
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
  browseHref: zHref,
});

export type MyTicketsPageProps = z.input<typeof myTicketsPagePropsSchema>;

/** Page · My tickets — stub tickets with actions and alerts. */
export function MyTicketsPage(props: MyTicketsPageProps) {
  validateProps("MyTicketsPage", myTicketsPagePropsSchema, props);
  const { header, nav, alerts, status, onRetry, tickets, showQrHref, transferHref, resaleHref, refundHref, onAddToWallet, browseHref } =
    props;
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
  resaleHref: zFn<(ticket: Ticket) => string>().optional(),
  onAddToWallet: zFn<(ticket: Ticket) => void>().optional(),
  backHref: zHref,
});

export type TicketWalletPageProps = z.input<typeof ticketWalletPagePropsSchema>;

/** Page · Ticket QR & transfer. */
export function TicketWalletPage(props: TicketWalletPageProps) {
  validateProps("TicketWalletPage", ticketWalletPagePropsSchema, props);
  const { header, groups, selectedKey, onSelect, index, onIndexChange, transfer, resaleHref, onAddToWallet, backHref } = props;
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
