import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { concertTicket, hold, listings, matchTicket, order, refundDone, refundInReview, refundOptions } from "../fixtures";
import { BrandPanel, FanIdCard, FanIdWizard, LoginForm, OtpForm, SignUpForm } from "./Account";
import { CheckoutForm, NextSteps, OrderHero, OrderSummaryStrip, UpsellBanner } from "./Checkout";
import { RefundPolicyCards, RefundStatusCard, RefundWizard } from "./Refunds";
import { ListingsCard, ResaleForm, ResaleInfoPanel } from "./Resale";
import { StubTicket, TicketActions, TicketDetailPanel, TransferForm } from "./Tickets";

const meta = {
  title: "Organisms/Checkout, tickets & account",
  component: CheckoutForm,
  args: { hold, onSubmit: () => {}, promo: { onApply: () => {} } },
} satisfies Meta<typeof CheckoutForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checkout: Story = {};
export const CheckoutDeclined: Story = { args: { serverError: "Your bank declined the payment. Try another card or payment method." } };

export const Confirmation: Story = {
  render: () => (
    <div className="flex max-w-[880px] flex-col gap-7">
      <OrderHero title="You're going" reference={order.reference} note="Confirmation sent by SMS and email" />
      <OrderSummaryStrip order={order} />
      <NextSteps steps={order.nextSteps} />
      <UpsellBanner
        title="Add parking for this match"
        detail="P2 West, 5 minutes from Gate 7 · 50 EGP"
        actionLabel="Add parking"
        onAction={() => {}}
      />
    </div>
  ),
};

export const StubTickets: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-5">
        <StubTicket ticket={matchTicket} />
        <TicketActions ticket={matchTicket} showQrHref="/tickets/1" transferHref="/t" resaleHref="/r" refundHref="/rf" />
      </div>
      <StubTicket ticket={concertTicket} />
      <StubTicket ticket={{ ...concertTicket, variant: "purple" }} />
      <StubTicket ticket={{ ...matchTicket, status: "refunded" }} />
    </div>
  ),
};

function WalletDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <TicketDetailPanel
        ticket={matchTicket}
        position={{ index: 1, of: 2 }}
        onPrevious={() => {}}
        onNext={() => {}}
        resaleHref="/resale"
        transfer={{ open, onOpenChange: setOpen, onSubmit: () => {} }}
      />
    </div>
  );
}
export const TicketWallet: Story = { render: () => <WalletDemo /> };

export const Transfer: Story = {
  render: () => (
    <TransferForm
      mode="contact"
      note="Your friend gets a new QR; yours stops working once they accept."
      onSubmit={() => {}}
      className="max-w-md"
    />
  ),
};

export const Resale: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <ResaleForm
        className="max-w-[620px] flex-1"
        tickets={[
          { id: "t1", label: "Nile FC vs Delta SC · W3 Row L Seat 19", price: 250 },
          { id: "t2", label: "Layla Nour Live · Golden Circle", price: 900 },
        ]}
        payoutOptions={[
          { id: "wallet", name: "Mobile wallet", note: "+20 10•• ••• 482" },
          { id: "instapay", name: "InstaPay", note: "omar.k@instapay" },
          { id: "bank", name: "Bank account", note: "Add IBAN" },
        ]}
        onSubmit={() => {}}
      />
      <div className="flex w-[400px] flex-col gap-4">
        <ResaleInfoPanel steps={["List your ticket at up to face value.", "Money arrives within 2 working days after the sale."]} />
        <ListingsCard listings={listings} onWithdraw={() => {}} />
      </div>
    </div>
  ),
};

function RefundWizardDemo() {
  const [step, setStep] = useState(1);
  return (
    <RefundWizard
      options={refundOptions}
      step={step}
      onStepChange={setStep}
      onSubmit={() => setStep(5)}
      result={refundInReview}
      trackHref="/refunds"
      ticketsHref="/tickets"
    />
  );
}
export const RefundRequest: Story = { render: () => <RefundWizardDemo /> };

export const RefundStatus: Story = {
  render: () => (
    <div className="flex max-w-5xl flex-col gap-6">
      <RefundStatusCard refund={refundInReview} onCancel={() => {}} onSecondary={() => {}} />
      <RefundStatusCard refund={refundDone} onSecondary={() => {}} />
      <RefundPolicyCards
        policies={[
          { title: "Matches", body: "Full refund if the match is cancelled or postponed.", tone: "ink" },
          { title: "Concerts", body: "Refund up to 7 days before the show.", tone: "lime" },
          { title: "Cinema", body: "Refund up to 2 hours before the showtime.", tone: "plum" },
        ]}
      />
    </div>
  ),
};

function AuthDemo() {
  const [resendAt] = useState(() => new Date(Date.now() + 45_000).toISOString());
  return (
    <div className="flex flex-wrap items-start gap-8">
      <BrandPanel
        title="One account for every match and every show"
        bullets={["Get alerts the moment your club goes on sale", "Pay with card, wallet, InstaPay or Fawry"]}
        className="w-[480px] rounded-2xl"
      />
      <SignUpForm onSubmit={() => {}} loginHref="/login" className="w-[420px]" />
      <OtpForm
        maskedPhone="+20 10•• ••• 482"
        resendAvailableAt={resendAt}
        onSubmit={() => {}}
        onResend={() => {}}
        onChangeNumber={() => {}}
        className="w-[420px]"
      />
      <LoginForm onSubmit={() => {}} signUpHref="/signup" className="w-[420px]" />
    </div>
  );
}
export const Account: Story = { render: () => <AuthDemo /> };

function FanIdDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className="flex max-w-[880px] flex-col gap-6">
      <FanIdWizard
        step={step}
        onStepChange={setStep}
        onScan={() => setStep(3)}
        extracted={{
          scanId: "scan_1",
          nameEn: "Omar Khaled",
          nameAr: "عمر خالد",
          idNumberMasked: "2 98 •••• •••• 21",
          dateOfBirth: "14 / 03 / 1998",
        }}
        onSubmit={() => setStep(5)}
        approved={{ name: "Omar Khaled", number: "2210 4417 4821", validUntil: "Oct 2029" }}
        browseHref="/events"
        skipHref="/"
      />
      <FanIdCard name="Omar Khaled" number="2210 4417 4821" validUntil="Oct 2029" />
    </div>
  );
}
export const FanId: Story = { render: () => <FanIdDemo /> };
