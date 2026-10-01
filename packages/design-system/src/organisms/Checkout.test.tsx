import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { hold, order } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { CheckoutForm, NextSteps, OrderHero, OrderSummaryStrip, UpsellBanner } from "./Checkout";

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

  it("validates card details with zod and focuses errors on submit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<CheckoutForm hold={hold} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Card number"), "4242424242424241");
    expect(screen.getByLabelText("Card number")).toHaveValue("4242 4242 4242 4241");
    await user.type(screen.getByLabelText("Expiry"), "0120");
    expect(screen.getByLabelText("Expiry")).toHaveValue("01 / 20");
    await user.click(screen.getByRole("button", { name: "Pay 530 EGP" }));
    expect(await screen.findByText("This card number isn't valid")).toBeInTheDocument();
    expect(screen.getByText("This card has expired")).toBeInTheDocument();
    expect(screen.getByText("Enter the 3 or 4 digit security code")).toBeInTheDocument();
    expect(screen.getByLabelText("Card number")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid card payment as the API payload", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<CheckoutForm hold={hold} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Card number"), "4242424242424242");
    await user.type(screen.getByLabelText("Expiry"), "1249");
    await user.type(screen.getByLabelText("CVC"), "123");
    await user.type(screen.getByLabelText("Name on card"), "Omar Khaled");
    await user.click(screen.getByRole("button", { name: "Pay 530 EGP" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      payment: {
        method: "card",
        cardNumber: "4242424242424242",
        expiry: "12 / 49",
        cvc: "123",
        nameOnCard: "Omar Khaled",
        saveCard: false,
      },
      acceptTerms: true,
    });
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
    renderUI(<OrderSummaryStrip order={{ ...order, status: "awaiting_payment", tickets: [], fawryReference: "712345678" }} />);
    expect(screen.getByText("712345678")).toBeInTheDocument();
  });
});
