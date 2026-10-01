import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { BrandPanel, FanIdCard, FanIdWizard, LoginForm, OtpForm, SignUpForm, type FanIdWizardProps } from "./Account";

describe("SignUpForm", () => {
  it("shows field errors from the shared zod schema", async () => {
    const onSubmit = vi.fn();
    const { user, container } = renderUI(<SignUpForm onSubmit={onSubmit} loginHref="/login" />);
    await user.type(screen.getByLabelText(/Full name/), "Omar");
    await user.type(screen.getByLabelText("Mobile number"), "123");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    expect(await screen.findByText("Enter your first and last name")).toBeInTheDocument();
    expect(screen.getByText(/valid Egyptian mobile number/)).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("You need to accept the terms to continue")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("submits normalised values", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<SignUpForm onSubmit={onSubmit} loginHref="/login" />);
    await user.type(screen.getByLabelText(/Full name/), "Sara Ahmed");
    await user.type(screen.getByLabelText("Mobile number"), "11 1234 5678");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("checkbox", { name: "I agree to the terms of use and privacy policy" }));
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: "Sara Ahmed",
        phone: "1112345678",
        email: "",
        password: "supersecret",
        acceptTerms: true,
        marketing: false,
      }),
    );
  });

  it("maps server field errors onto inputs", async () => {
    renderUI(
      <SignUpForm
        onSubmit={() => {}}
        loginHref="/login"
        fieldErrors={{ phone: "An account with this mobile number already exists." }}
        serverError="Please fix the highlighted fields"
      />,
    );
    expect(await screen.findByText("An account with this mobile number already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<SignUpForm onSubmit={() => {}} loginHref="login" />), /loginHref/);
  });
});

describe("OtpForm", () => {
  it("requires 6 digits, submits the code and offers resend after the countdown", async () => {
    const onSubmit = vi.fn();
    const onResend = vi.fn();
    const now = new Date("2026-10-01T10:00:00Z").getTime();
    const { user, container, rerender } = renderUI(
      <OtpForm
        maskedPhone="+20 11•• ••• 678"
        resendAvailableAt="2026-10-01T10:00:45Z"
        onSubmit={onSubmit}
        onResend={onResend}
        onChangeNumber={() => {}}
        note="Next we'll set up your Fan ID."
      />,
      { now: () => now },
    );
    expect(screen.getByText("Resend code in 0:45")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(await screen.findByText("Enter the 6-digit code")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Digit 1"));
    await user.keyboard("123456");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("123456"));
    await expectNoA11yViolations(container);
    rerender(
      <OtpForm
        maskedPhone="+20 11•• ••• 678"
        resendAvailableAt="2026-10-01T09:00:00Z"
        onSubmit={onSubmit}
        onResend={onResend}
        onChangeNumber={() => {}}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Resend code" }));
    expect(onResend).toHaveBeenCalled();
  });
});

describe("LoginForm", () => {
  it("validates and submits credentials", async () => {
    const onSubmit = vi.fn();
    const { user, container } = renderUI(
      <LoginForm onSubmit={onSubmit} signUpHref="/signup" serverError="Mobile number or password is incorrect" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("incorrect");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your password")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Mobile number"), "1012345482");
    await user.type(screen.getByLabelText("Password"), "matchpass123");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ phone: "1012345482", password: "matchpass123" }));
    await expectNoA11yViolations(container);
  });
});

describe("BrandPanel & FanIdCard", () => {
  it("render accessibly", async () => {
    const { container } = renderUI(
      <div>
        <BrandPanel title="One account for every match" bullets={["Get alerts", "Pay your way"]} />
        <FanIdCard name="Omar Khaled" number="2210 4417 4821" validUntil="Oct 2029" />
      </div>,
    );
    expect(screen.getByRole("region", { name: "Your Fan ID" })).toHaveTextContent("2210 4417 4821");
    expect(screen.getByText("Valid until Oct 2029")).toBeInTheDocument();
    await expectNoA11yViolations(container);
    expectInvalidProps(() => renderUI(<BrandPanel title="x" bullets={[]} />), /bullets/);
  });
});

describe("FanIdWizard", () => {
  function Harness(overrides: Partial<FanIdWizardProps>) {
    const [step, setStep] = useState(1);
    return (
      <FanIdWizard
        step={step}
        onStepChange={setStep}
        onScan={() => setStep(3)}
        extracted={{
          scanId: "scan_1",
          nameEn: "Sara Ahmed",
          nameAr: "سارة أحمد",
          idNumberMasked: "2 98 •••• •••• 21",
          dateOfBirth: "14 / 03 / 1998",
        }}
        onSubmit={() => setStep(5)}
        approved={{ name: "Sara Ahmed", number: "2210 4417 1234", validUntil: "Oct 2029" }}
        browseHref="/events"
        skipHref="/"
        {...overrides}
      />
    );
  }

  const photo = () => new File(["x"], "id.jpg", { type: "image/jpeg" });

  it("guides through document, photos, selfie, review and approval", async () => {
    const onScan = vi.fn();
    const onSubmit = vi.fn();
    function Spy() {
      const [step, setStep] = useState(1);
      return (
        <FanIdWizard
          step={step}
          onStepChange={setStep}
          onScan={(v) => {
            onScan(v);
            setStep(3);
          }}
          extracted={{
            scanId: "scan_1",
            nameEn: "Sara Ahmed",
            nameAr: "سارة أحمد",
            idNumberMasked: "2 98 •••• •••• 21",
            dateOfBirth: "14 / 03 / 1998",
          }}
          onSubmit={(v) => {
            onSubmit(v);
            setStep(5);
          }}
          approved={{ name: "Sara Ahmed", number: "2210 4417 1234", validUntil: "Oct 2029" }}
          browseHref="/events"
          skipHref="/"
        />
      );
    }
    const { user, container } = renderUI(<Spy />);
    expect(screen.getByRole("radio", { name: /Egyptian national ID/ })).toBeChecked();
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { level: 1, name: "Scan your document" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add a photo of the front");
    await user.upload(screen.getByLabelText("Take photo or upload · front side"), photo());
    await user.upload(screen.getByLabelText("Take photo or upload · back side"), photo());
    expect(screen.getByText("Front side added")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onScan).toHaveBeenCalledWith({ documentType: "national_id", frontCaptured: true, backCaptured: true });
    expect(screen.getByRole("heading", { level: 1, name: "Confirm it’s you" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Take a selfie to continue");
    await user.upload(screen.getByLabelText("Take selfie"), photo());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Name (Arabic)")).toHaveValue("سارة أحمد");
    await user.click(screen.getByRole("button", { name: "Submit for verification" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Confirm your details to continue");
    await user.click(screen.getByRole("checkbox", { name: /I confirm these details are correct/ }));
    await user.click(screen.getByRole("button", { name: "Submit for verification" }));
    expect(onSubmit).toHaveBeenCalledWith({ scanId: "scan_1", selfieCaptured: true, confirmDetails: true });
    expect(screen.getByRole("heading", { level: 1, name: "Your Fan ID is ready" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse matches" })).toHaveAttribute("href", "/events");
  });

  it("only needs the front of a passport", async () => {
    const onScan = vi.fn();
    const { user } = renderUI(<Harness onScan={onScan} />);
    await user.click(screen.getByRole("radio", { name: /Passport/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Photograph your passport" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/back side/)).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText("Take photo or upload · front side"), photo());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onScan).toHaveBeenCalledWith({ documentType: "passport", frontCaptured: true, backCaptured: false });
  });

  it("offers a skip link and validates props", () => {
    renderUI(<Harness />);
    expect(screen.getByRole("link", { name: /Skip for now/ })).toHaveAttribute("href", "/");
    expectInvalidProps(() => renderUI(<Harness step={0} />), /step/);
  });
});
