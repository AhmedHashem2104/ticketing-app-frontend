import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderUI } from "../../test/utils";
import { matchSummary } from "../fixtures";
import { devSamples, sampleImageFile } from "../lib/dev-samples";
import { EventCard } from "../molecules/Events";
import { LoginForm, SignUpForm } from "../organisms/Account";
import { DevAutofillButton } from "./DevAutofill";
import { Avatar, TeamCrest } from "./Identity";
import { CoverImage } from "./Media";

describe("CoverImage", () => {
  it("renders a decorative photo and removes it when it fails to load", () => {
    const { container } = renderUI(
      <div className="relative isolate">
        <CoverImage src="/images/events/x.jpg" />
      </div>,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/images/events/x.jpg");
    expect(img).toHaveAttribute("alt", "");
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders nothing without a src", () => {
    const { container } = renderUI(<CoverImage />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Avatar & TeamCrest images", () => {
  it("shows the photo over the initials and falls back to the initials on error", () => {
    const { container } = renderUI(<Avatar initials="OK" src="/images/avatars/omar.jpg" label="Omar Khaled" />);
    expect(screen.getByRole("img", { name: "Omar Khaled" })).toHaveTextContent("OK");
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows a crest image, or the lettered badge when it fails", () => {
    const { container } = renderUI(<TeamCrest short="NFC" src="/images/teams/nfc.svg" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container).toHaveTextContent("NFC");
  });

  it("puts the event photo on event cards", () => {
    const { container } = renderUI(<EventCard event={{ ...matchSummary, imageUrl: "/images/events/derby.jpg" }} href="/e" />);
    expect(container.querySelector('img[src="/images/events/derby.jpg"]')).not.toBeNull();
  });
});

describe("DevAutofillButton", () => {
  it("is hidden unless dev tools are on", () => {
    renderUI(<DevAutofillButton onFill={() => {}} />);
    expect(screen.queryByRole("button", { name: /autofill/i })).toBeNull();
  });

  it("calls onFill when dev tools are on", async () => {
    const onFill = vi.fn();
    const { user } = renderUI(<DevAutofillButton onFill={onFill} />, { devTools: true });
    await user.click(screen.getByRole("button", { name: /autofill/i }));
    expect(onFill).toHaveBeenCalledOnce();
  });

  it("fills the login form with the demo account, ready to submit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<LoginForm onSubmit={onSubmit} signUpHref="/signup" />, { devTools: true });
    await user.click(screen.getByRole("button", { name: /autofill demo account/i }));
    expect(screen.getByLabelText("Password")).toHaveValue(devSamples.login.password);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ phone: "1012345482", password: "matchpass123" }));
  });

  it("fills a valid new sign-up", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<SignUpForm onSubmit={onSubmit} loginHref="/login" />, { devTools: true });
    await user.click(screen.getByRole("button", { name: /autofill a new account/i }));
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ acceptTerms: true, password: devSamples.newPassword });
  });

  it("makes JPEG sample photos for the Fan ID uploads", async () => {
    const file = await sampleImageFile("selfie");
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBeGreaterThan(0);
  });
});
