import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expiredOrder, failedOrder, fawryOrder, hold, order, walletPendingOrder } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { CheckoutForm, NextSteps, OrderHero, OrderPaymentStatus, OrderSummaryStrip, UpsellBanner } from "./Checkout";

describe("CheckoutForm", () => {
  it("renders holders, methods and the summary", async () => {
    const { container } = renderUI(<CheckoutForm hold={hold} onSubmit={() => {}} />);
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByText("Youssef A.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Debit or credit card/ })).toBeChecked();
    expect(screen.getByRole("list", { name: "Price breakdown" })).toHaveTextContent("Category 1 · West stand × 2500.00");
    expect(screen.getByRole("button", { name: "Pay 530 EGP" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("never collects card details — cards are paid on the provider's hosted page", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<CheckoutForm hold={hold} onSubmit={onSubmit} />);
    expect(screen.queryByLabelText("Card number")).not.toBeInTheDocument();
    expect(screen.getByText(/enter your card on our payment provider’s secure page/)).toBeInTheDocument();
    expect(screen.getByText(/Your card details never reach Matchpass/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pay 530 EGP" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({ payment: { method: "card" }, acceptTerms: true });
  });

  it("switches payment methods, labels and requires terms", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<CheckoutForm hold={hold} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("radio", { name: /Mobile wallet/ }));
    expect(screen.getByRole("button", { name: "Pay 530 EGP with wallet" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Wallet phone number"), "123");
    await user.click(screen.getByRole("button", { name: /with wallet/ }));
    expect(await screen.findByText(/valid Egyptian mobile number/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Fawry reference/ }));
    expect(screen.getByText(/We’ll give you a reference number/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /I agree to the terms of sale/ }));
    await user.click(screen.getByRole("button", { name: "Get Fawry reference" }));
    expect(await screen.findByText("Accept the terms of sale to pay")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /I agree to the terms of sale/ }));
    await user.click(screen.getByRole("button", { name: "Get Fawry reference" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ payment: { method: "fawry" }, acceptTerms: true }));
  });

  it("validates promo codes locally before calling the API", async () => {
    const onApply = vi.fn();
    const { user, rerender } = renderUI(<CheckoutForm hold={hold} onSubmit={() => {}} promo={{ onApply }} />);
    await user.type(screen.getByLabelText("Promo code"), "x");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Promo codes are 4–16 letters or numbers");
    await user.clear(screen.getByLabelText("Promo code"));
    await user.type(screen.getByLabelText("Promo code"), "matchpass10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("MATCHPASS10");
    rerender(<CheckoutForm hold={{ ...hold, promoCode: "MATCHPASS10" }} onSubmit={() => {}} promo={{ onApply }} />);
    expect(screen.getByRole("status")).toHaveTextContent("MATCHPASS10 applied");
  });

  it("shows server errors and a busy pay button", () => {
    renderUI(<CheckoutForm hold={hold} onSubmit={() => {}} submitting serverError="Your bank declined the payment." />);
    expect(screen.getByRole("alert")).toHaveTextContent("declined");
    expect(screen.getByRole("button", { name: "Processing payment…" })).toBeDisabled();
  });

  it("validates the hold against the contract", () => {
    expectInvalidProps(() => renderUI(<CheckoutForm hold={{ ...hold, total: -5 }} onSubmit={() => {}} />), /total/);
  });
});

describe("order confirmation", () => {
  it("renders the hero, summary, next steps and upsell", async () => {
    const onAdd = vi.fn();
    const { user, container } = renderUI(
      <div>
        <OrderHero title="You're going" reference={order.reference} note="Confirmation sent by SMS and email" />
        <OrderSummaryStrip order={order} />
        <NextSteps steps={order.nextSteps} />
        <UpsellBanner title="Add parking for this match" detail="P2 West · 50 EGP" actionLabel="Add parking" onAction={onAdd} />
      </div>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "You're going" })).toBeInTheDocument();
    expect(screen.getByText("MP-2410-58213")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Order details" })).toHaveTextContent("Omar K. · Fan ID •••• 4821");
    expect(screen.getByRole("region", { name: "Order details" })).toHaveTextContent("530 EGP");
    await user.click(screen.getByRole("button", { name: "Add parking" }));
    expect(onAdd).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("shows the Fawry reference for unpaid orders", () => {
    renderUI(<OrderSummaryStrip order={fawryOrder} />);
    expect(screen.getByText("712345678")).toBeInTheDocument();
  });
});

describe("OrderPaymentStatus", () => {
  it("waits for wallet approval and explains what to do", async () => {
    const { container } = renderUI(<OrderPaymentStatus order={walletPendingOrder} />);
    expect(screen.getByRole("heading", { level: 1, name: "Waiting for your payment" })).toBeInTheDocument();
    expect(screen.getByText(/Approve the payment request/)).toBeInTheDocument();
    expect(screen.getByText("This page updates by itself once the payment arrives.")).toHaveAttribute("role", "status");
    await expectNoA11yViolations(container);
  });

  it("shows the Fawry bill with its deadline", () => {
    renderUI(<OrderPaymentStatus order={fawryOrder} />);
    expect(screen.getByRole("heading", { name: "Almost there" })).toBeInTheDocument();
    expect(screen.getByText("712345678")).toBeInTheDocument();
    expect(screen.getByText("Pay before Sat 3 Oct at 10:05")).toBeInTheDocument();
  });

  it("sends unfinished card payments back to the hosted page", () => {
    renderUI(<OrderPaymentStatus order={{ ...walletPendingOrder, payment: { method: "card", redirectUrl: "/api/payments/abc" } }} />);
    expect(screen.getByRole("link", { name: "Continue to secure payment" })).toHaveAttribute("href", "/api/payments/abc");
  });

  it("offers a retry for failed payments and a restart for expired orders", async () => {
    const { container, rerender } = renderUI(<OrderPaymentStatus order={failedOrder} retryHref="/checkout/hold_1" eventHref="/events/x" />);
    expect(screen.getByRole("heading", { name: "Payment didn’t go through" })).toBeInTheDocument();
    expect(screen.getByText(/bank declined/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try paying again" })).toHaveAttribute("href", "/checkout/hold_1");
    await expectNoA11yViolations(container);
    rerender(<OrderPaymentStatus order={expiredOrder} retryHref="/checkout/hold_1" eventHref="/events/x" />);
    expect(screen.getByRole("heading", { name: "This order expired" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose tickets again" })).toHaveAttribute("href", "/events/x");
  });

  it("refuses paid orders", () => {
    expectInvalidProps(() => renderUI(<OrderPaymentStatus order={order} />), /paid orders/);
  });
});
