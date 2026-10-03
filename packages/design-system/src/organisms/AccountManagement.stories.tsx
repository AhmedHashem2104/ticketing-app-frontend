import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  expiredOrder,
  failedOrder,
  fans,
  fawryOrder,
  incomingTransfer,
  matchTicket,
  newUser,
  notifications,
  outgoingTransfer,
  qrToken,
  user,
  walletPendingOrder,
} from "../fixtures";
import { AccountProfileCard, ForgotPasswordForm, LinkedFansManager, PreferencesForm } from "./Account";
import { OrderPaymentStatus } from "./Checkout";
import { NotificationBell, SiteHeader } from "./Header";
import { TicketDetailPanel, TransfersCard } from "./Tickets";

const meta = {
  title: "Organisms/Account, transfers & payments",
  component: AccountProfileCard,
  args: { user, fanIdHref: "/fan-id", onSignOut: () => {} },
} satisfies Meta<typeof AccountProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Profile: Story = {};
export const ProfileWithoutFanId: Story = { args: { user: newUser } };

export const HeaderWithAccountMenu: Story = {
  render: () => (
    <SiteHeader
      links={[
        { id: "matches", label: "Matches", href: "/events" },
        { id: "tickets", label: "My tickets", href: "/tickets" },
      ]}
      activeId="tickets"
      notifications={<NotificationBell items={notifications} unread={1} onMarkAllRead={() => {}} allHref="/notifications" />}
      account={{
        status: "signed_in",
        initials: "OK",
        name: "Omar Khaled",
        href: "/account",
        menu: {
          links: [
            { label: "My tickets", href: "/tickets" },
            { label: "Account", href: "/account" },
          ],
          onSignOut: () => {},
        },
      }}
    />
  ),
};

export const Bell: Story = { render: () => <NotificationBell items={notifications} unread={1} onMarkAllRead={() => {}} /> };

export const ForgotPasswordRequest: Story = {
  render: () => (
    <div className="max-w-[440px]">
      <ForgotPasswordForm stage="request" onRequest={() => {}} onReset={() => {}} onStartOver={() => {}} loginHref="/login" />
    </div>
  ),
};

export const ForgotPasswordReset: Story = {
  render: () => (
    <div className="max-w-[440px]">
      <ForgotPasswordForm
        stage="reset"
        maskedPhone="+20 10•• ••• 482"
        onRequest={() => {}}
        onReset={() => {}}
        onStartOver={() => {}}
        loginHref="/login"
      />
    </div>
  ),
};

export const Preferences: Story = {
  render: () => (
    <div className="max-w-[560px]">
      <PreferencesForm defaultValues={user.preferences} onSubmit={() => {}} saved />
    </div>
  ),
};

export const LinkedFans: Story = {
  render: function Render() {
    const [list, setList] = useState(fans);
    return (
      <div className="max-w-[560px]">
        <LinkedFansManager fans={list} canLink onUnlink={(id) => setList((l) => l.filter((f) => f.id !== id))} onLink={() => {}} />
      </div>
    );
  },
};

export const Transfers: Story = {
  render: () => (
    <div className="flex max-w-[720px] flex-col gap-4">
      <TransfersCard title="Sent to you" transfers={[incomingTransfer]} onAccept={() => {}} onDecline={() => {}} />
      <TransfersCard
        title="Sent by you"
        transfers={[outgoingTransfer, { ...outgoingTransfer, id: "trf_3", status: "accepted" }]}
        onCancel={() => {}}
      />
    </div>
  ),
};

export const LiveEntryQr: Story = {
  render: () => (
    <TicketDetailPanel
      ticket={{ ...matchTicket, qrReady: true }}
      position={{ index: 1, of: 2 }}
      onPrevious={() => {}}
      onNext={() => {}}
      qr={{ token: { ...qrToken, expiresAt: "2099-01-01T00:00:00Z", refreshInSeconds: 30 }, onExpire: () => {} }}
    />
  ),
};

export const TransferPending: Story = {
  render: () => (
    <TicketDetailPanel
      ticket={{ ...matchTicket, status: "transfer_pending" }}
      position={{ index: 1, of: 1 }}
      onPrevious={() => {}}
      onNext={() => {}}
      onCancelTransfer={() => {}}
    />
  ),
};

export const PaymentWaitingForWallet: Story = { render: () => <OrderPaymentStatus order={walletPendingOrder} /> };
export const PaymentFawryBill: Story = { render: () => <OrderPaymentStatus order={fawryOrder} /> };
export const PaymentFailed: Story = { render: () => <OrderPaymentStatus order={failedOrder} retryHref="/checkout/hold_1" /> };
export const PaymentExpired: Story = { render: () => <OrderPaymentStatus order={expiredOrder} eventHref="/events/nile-fc-vs-delta-sc" /> };
