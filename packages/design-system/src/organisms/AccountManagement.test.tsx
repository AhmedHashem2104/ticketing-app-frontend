import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fans, newUser, notifications, user as omar } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { AccountProfileCard, ForgotPasswordForm, LinkedFansManager, LoginForm, PreferencesForm } from "./Account";
import { NotificationBell, SiteHeader } from "./Header";

describe("SiteHeader account menu", () => {
  const links = [{ id: "matches", label: "Matches", href: "/events" }];

  it("opens a dropdown with account links and sign out", async () => {
    const onSignOut = vi.fn();
    const { user, container } = renderUI(
      <SiteHeader
        links={links}
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
            onSignOut,
          },
        }}
      />,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Account menu: Omar Khaled" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "My tickets" })).toHaveAttribute("href", "/tickets");
    await user.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it("offers sign out in the mobile menu too", async () => {
    const onSignOut = vi.fn();
    const { user } = renderUI(
      <SiteHeader
        links={links}
        account={{
          status: "signed_in",
          initials: "OK",
          name: "Omar Khaled",
          href: "/account",
          menu: { links: [{ label: "Account", href: "/account" }], onSignOut },
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it("renders the notifications slot only when signed in", () => {
    const bell = <NotificationBell items={[]} unread={0} />;
    const { rerender } = renderUI(
      <SiteHeader links={links} notifications={bell} account={{ status: "signed_out", signInHref: "/login" }} />,
    );
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
    rerender(
      <SiteHeader links={links} notifications={bell} account={{ status: "signed_in", initials: "OK", name: "Omar", href: "/account" }} />,
    );
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});

describe("NotificationBell", () => {
  it("announces the unread count, lists updates and marks them read", async () => {
    const onMarkAllRead = vi.fn();
    const onOpenChange = vi.fn();
    const { user, container } = renderUI(
      <NotificationBell
        items={notifications}
        unread={1}
        onMarkAllRead={onMarkAllRead}
        onOpenChange={onOpenChange}
        allHref="/notifications"
      />,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByRole("link", { name: /Omar Khaled sent you a ticket/ })).toHaveAttribute("href", "/transfers");
    expect(screen.getByRole("img", { name: "Unread" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(onMarkAllRead).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "See all notifications" })).toHaveAttribute("href", "/notifications");
  });

  it("shows an empty state", async () => {
    const { user } = renderUI(<NotificationBell items={[]} unread={0} />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You’re all caught up.")).toBeInTheDocument();
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<NotificationBell items={[]} unread={-1} />), /unread/);
  });
});

describe("LoginForm forgot password link", () => {
  it("links to the reset flow when provided", () => {
    renderUI(<LoginForm onSubmit={() => {}} signUpHref="/signup" forgotHref="/forgot-password" />);
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  });
});

describe("ForgotPasswordForm", () => {
  it("requests a code for a valid mobile number", async () => {
    const onRequest = vi.fn();
    const { user, container } = renderUI(
      <ForgotPasswordForm stage="request" onRequest={onRequest} onReset={() => {}} onStartOver={() => {}} loginHref="/login" />,
    );
    await user.type(screen.getByLabelText("Mobile number"), "123");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByText(/valid Egyptian mobile number/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Mobile number"));
    await user.type(screen.getByLabelText("Mobile number"), "10 1234 5482");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ phone: "1012345482" }));
    await expectNoA11yViolations(container);
  });

  it("requires the code and matching passwords", async () => {
    const onReset = vi.fn();
    const onStartOver = vi.fn();
    const { user, container } = renderUI(
      <ForgotPasswordForm
        stage="reset"
        maskedPhone="+20 10•• ••• 482"
        onRequest={() => {}}
        onReset={onReset}
        onStartOver={onStartOver}
        loginHref="/login"
      />,
    );
    expect(screen.getByText("+20 10•• ••• 482")).toBeInTheDocument();
    await user.type(screen.getByLabelText("New password"), "brandnewpass");
    await user.type(screen.getByLabelText("Confirm new password"), "different");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(screen.getByText("Enter the 6-digit code")).toBeInTheDocument();
    await user.click(screen.getByRole("textbox", { name: /Digit 1/ }));
    await user.keyboard("123456");
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "brandnewpass");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    await waitFor(() =>
      expect(onReset).toHaveBeenCalledWith({ code: "123456", password: "brandnewpass", confirmPassword: "brandnewpass" }),
    );
    await user.click(screen.getByRole("button", { name: "Use a different number" }));
    expect(onStartOver).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });
});

describe("PreferencesForm", () => {
  it("toggles channels and saves them", async () => {
    const onSubmit = vi.fn();
    const { user, container, rerender } = renderUI(<PreferencesForm defaultValues={omar.preferences} onSubmit={onSubmit} />);
    const marketing = screen.getByRole("switch", { name: "News and offers" });
    expect(marketing).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "SMS updates" })).toBeChecked();
    await user.click(marketing);
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ sms: true, email: true, marketing: true }));
    rerender(<PreferencesForm defaultValues={omar.preferences} onSubmit={onSubmit} saved />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    await expectNoA11yViolations(container);
  });
});

describe("AccountProfileCard", () => {
  it("shows the profile, Fan ID and sign out", async () => {
    const onSignOut = vi.fn();
    const { user, container, rerender } = renderUI(<AccountProfileCard user={omar} fanIdHref="/fan-id" onSignOut={onSignOut} />);
    expect(screen.getByRole("heading", { name: "Omar Khaled" })).toBeInTheDocument();
    expect(screen.getByText("2210 4417 4821")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fan ID/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalled();
    await expectNoA11yViolations(container);
    rerender(<AccountProfileCard user={newUser} fanIdHref="/fan-id" onSignOut={onSignOut} />);
    expect(screen.getByRole("link", { name: "Get your Fan ID" })).toHaveAttribute("href", "/fan-id");
  });
});

describe("LinkedFansManager", () => {
  it("unlinks fans and links a new one with a validated Fan ID number", async () => {
    const onLink = vi.fn();
    const onUnlink = vi.fn();
    const twoFans = fans.slice(0, 2);
    const { user, container } = renderUI(<LinkedFansManager fans={twoFans} onLink={onLink} onUnlink={onUnlink} canLink />);
    expect(screen.queryByRole("button", { name: "Unlink Omar K. (you)" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unlink Youssef A." }));
    expect(onUnlink).toHaveBeenCalledWith("fan_youssef");
    await user.type(screen.getByLabelText(/Their full name/), "Nour Hassan");
    await user.type(screen.getByLabelText(/Their Fan ID number/), "123");
    await user.click(screen.getByRole("button", { name: "Link fan" }));
    expect(await screen.findByText("Fan ID numbers have 12 digits")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Their Fan ID number/));
    await user.type(screen.getByLabelText(/Their Fan ID number/), "2210 4417 0001");
    await user.click(screen.getByRole("button", { name: "Link fan" }));
    await waitFor(() => expect(onLink).toHaveBeenCalledWith({ name: "Nour Hassan", fanIdNumber: "221044170001" }));
    await expectNoA11yViolations(container);
  });

  it("stops at the limit and asks fans without a Fan ID to get one first", () => {
    const { rerender } = renderUI(
      <LinkedFansManager
        fans={[...fans, { ...fans[1]!, id: "fan_extra", name: "Mariam K." }]}
        onLink={() => {}}
        onUnlink={() => {}}
        canLink
      />,
    );
    expect(screen.getByText(/linked the maximum of 3 fans/)).toBeInTheDocument();
    rerender(<LinkedFansManager fans={[]} onLink={() => {}} onUnlink={() => {}} canLink={false} />);
    expect(screen.getByText(/Get your own Fan ID first/)).toBeInTheDocument();
  });
});
