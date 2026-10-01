import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { refundDone, refundInReview, refundOptions } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { RefundPolicyCards, RefundStatusCard, RefundTracker, RefundWizard, type RefundWizardProps } from "./Refunds";

function Wizard(props: Partial<RefundWizardProps> & { onSubmit?: RefundWizardProps["onSubmit"] }) {
  const [step, setStep] = useState(1);
  return (
    <RefundWizard
      options={refundOptions}
      step={step}
      onStepChange={setStep}
      onSubmit={props.onSubmit ?? (() => setStep(5))}
      trackHref="/refunds"
      ticketsHref="/tickets"
      {...props}
    />
  );
}

describe("RefundWizard", () => {
  it("blocks continuing without tickets and updates the summary live", async () => {
    const { user, container } = renderUI(<Wizard />);
    expect(screen.getByRole("heading", { level: 1, name: "Request a refund" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Refund summary" })).toHaveTextContent("You get back1,800 EGP");
    await user.click(screen.getByRole("checkbox", { name: "Golden Circle · Ticket 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Golden Circle · Ticket 2" }));
    expect(screen.getByRole("complementary", { name: "Refund summary" })).toHaveTextContent("You get back0 EGP");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Choose at least one ticket.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Request a refund");
    await expectNoA11yViolations(container);
  });

  it("walks every step and submits the API payload", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<Wizard onSubmit={onSubmit} />);
    await user.click(screen.getByRole("checkbox", { name: "Golden Circle · Ticket 2" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Tell us why" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Something else" }));
    await user.type(screen.getByLabelText(/Tell us more/), "Family wedding");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Choose refund method" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Matchpass credit/ }));
    expect(screen.getByRole("complementary", { name: "Refund summary" })).toHaveTextContent("Credit bonus +5%+45 EGP");
    expect(screen.getByRole("complementary", { name: "Refund summary" })).toHaveTextContent("You get back945 EGP");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Confirm your refund" })).toBeInTheDocument();
    expect(screen.getByText("Golden Circle · Ticket 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit refund request" }));
    expect(await screen.findByText("Tick the box to confirm.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: /once the refund is approved/ }));
    await user.click(screen.getByRole("button", { name: "Submit refund request" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        orderId: "ord_2",
        ticketIds: ["tkt_3"],
        reason: "other",
        details: "Family wedding",
        method: "credit",
        acknowledge: true,
      }),
    );
  });

  it("goes back and shows the done step with the reference", async () => {
    const { rerender } = renderUI(
      <RefundWizard
        options={refundOptions}
        step={2}
        onStepChange={vi.fn()}
        onSubmit={() => {}}
        trackHref="/refunds"
        ticketsHref="/tickets"
      />,
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    rerender(
      <RefundWizard
        options={refundOptions}
        step={5}
        onStepChange={vi.fn()}
        onSubmit={() => {}}
        result={refundInReview}
        trackHref="/refunds"
        ticketsHref="/tickets"
      />,
    );
    expect(screen.getByText("RF-2410-0091")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Track refund" })).toHaveAttribute("href", "/refunds");
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("validates options and step", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <RefundWizard
            options={{ ...refundOptions, tickets: [] }}
            step={1}
            onStepChange={() => {}}
            onSubmit={() => {}}
            trackHref="/r"
            ticketsHref="/t"
          />,
        ),
      /no refundable tickets/,
    );
    expectInvalidProps(
      () =>
        renderUI(
          <RefundWizard options={refundOptions} step={6} onStepChange={() => {}} onSubmit={() => {}} trackHref="/r" ticketsHref="/t" />,
        ),
      /step/,
    );
  });
});

describe("RefundStatusCard & tracker", () => {
  it("shows progress, note and cancel action", async () => {
    const onCancel = vi.fn();
    const { user, container } = renderUI(<RefundStatusCard refund={refundInReview} onCancel={onCancel} onSecondary={() => {}} />);
    expect(screen.getByRole("heading", { name: "Layla Nour Live" })).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[1]).toHaveTextContent("Reviewing (in progress)");
    await user.click(screen.getByRole("button", { name: "Cancel request — keep my tickets" }));
    expect(onCancel).toHaveBeenCalledWith("rf_1");
    await expectNoA11yViolations(container);
  });

  it("shows the refunded stub ticket and no cancel action when done", () => {
    renderUI(<RefundStatusCard refund={refundDone} onCancel={() => {}} />);
    expect(screen.getByText("REFUNDED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel request/ })).not.toBeInTheDocument();
  });

  it("renders a failed step and validates", () => {
    renderUI(
      <RefundTracker
        steps={[
          { label: "Requested", when: "1 Oct", state: "done" },
          { label: "Not approved", when: "1 Oct", state: "failed" },
        ]}
      />,
    );
    expect(screen.getByText(/Not approved/)).toHaveTextContent("(stopped)");
    // @ts-expect-error unknown state
    expectInvalidProps(() => renderUI(<RefundTracker steps={[{ label: "x", when: "y", state: "paused" }]} />), /state/);
  });

  it("renders policy cards", async () => {
    const { container } = renderUI(
      <RefundPolicyCards
        policies={[
          { title: "Matches", body: "Full refund if cancelled.", tone: "ink" },
          { title: "Cinema", body: "Up to 2 hours before.", tone: "plum" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Cinema" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
