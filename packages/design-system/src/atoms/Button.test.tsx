import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { AppLink } from "./AppLink";
import { Button, LinkButton } from "./Button";

describe("Button", () => {
  it("renders a type=button by default and handles clicks", async () => {
    const onClick = vi.fn();
    const { user } = renderUI(<Button onClick={onClick}>Join the waiting room</Button>);
    const button = screen.getByRole("button", { name: "Join the waiting room" });
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the variant and size as data attributes", () => {
    renderUI(
      <Button variant="primary" size="xl">
        Get tickets
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "xl");
    expect(button.className).toContain("bg-gold");
  });

  it("disables and marks itself busy while loading", async () => {
    const onClick = vi.fn();
    const { user } = renderUI(
      <Button loading loadingText="Paying…" onClick={onClick}>
        Pay 530 EGP
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Paying…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is accessible", async () => {
    const { container } = renderUI(
      <div>
        <Button>Save</Button>
        <Button size="icon" aria-label="Remove seat">
          ×
        </Button>
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<Button size="icon">×</Button>), /aria-label/);
    // @ts-expect-error invalid variant on purpose
    expectInvalidProps(() => renderUI(<Button variant="neon">Go</Button>), /variant/);
  });
});

describe("LinkButton", () => {
  it("renders a link styled as a button", () => {
    renderUI(<LinkButton href="/events">See all events</LinkButton>);
    const link = screen.getByRole("link", { name: "See all events" });
    expect(link).toHaveAttribute("href", "/events");
    expect(link.className).toContain("bg-gold");
  });

  it("renders a disabled, non-navigable link", () => {
    renderUI(
      <LinkButton href="/checkout" disabled>
        Continue
      </LinkButton>,
    );
    const link = screen.getByRole("link", { name: "Continue" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
  });

  it("rejects relative hrefs", () => {
    expectInvalidProps(() => renderUI(<LinkButton href="events">Go</LinkButton>), /href/);
  });
});

describe("AppLink", () => {
  it("marks the current page", () => {
    renderUI(
      <AppLink href="/tickets" current>
        My tickets
      </AppLink>,
    );
    expect(screen.getByRole("link", { name: "My tickets" })).toHaveAttribute("aria-current", "page");
  });

  it("opens external links safely and announces it", async () => {
    const { container } = renderUI(
      <AppLink href="https://example.com/help" external>
        Help centre
      </AppLink>,
    );
    const link = screen.getByRole("link", { name: /Help centre/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("opens in a new tab");
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    // eslint-disable-next-line jsx-a11y/anchor-is-valid -- asserting that unsafe hrefs are rejected
    expectInvalidProps(() => renderUI(<AppLink href="javascript:alert(1)">x</AppLink>), /href/);
  });
});

describe("Button before hydration", () => {
  it("renders submit buttons disabled on the server so forms can't submit natively", async () => {
    const { renderToString } = await import("react-dom/server");
    expect(renderToString(<Button type="submit">Log in</Button>)).toMatch(/disabled=""/);
    expect(renderToString(<Button>Open</Button>)).not.toMatch(/disabled=""/);
  });
});
