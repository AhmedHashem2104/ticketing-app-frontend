import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { Container, SiteLayout, SplitLayout, TwoColumn } from "./Layouts";

describe("templates", () => {
  it("SiteLayout provides a skip link, header and main landmark", async () => {
    const { user } = renderUI(
      <SiteLayout header={<header>Header</header>} footer={<footer>Footer</footer>}>
        <Container>
          <h1>Page</h1>
          <TwoColumn aside={<p>Summary</p>} asideLabel="Order summary">
            <p>Main</p>
          </TwoColumn>
        </Container>
      </SiteLayout>,
    );
    await user.tab();
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("complementary", { name: "Order summary" })).toHaveTextContent("Summary");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("SplitLayout renders panel and form side by side", async () => {
    renderUI(
      <SplitLayout panel={<section aria-label="Brand">Brand</section>} topRight={<button type="button">ع</button>}>
        <h1>Create your account</h1>
      </SplitLayout>,
    );
    expect(screen.getByRole("main")).toHaveTextContent("Create your account");
    expect(screen.getByRole("button", { name: "ع" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("validates props", () => {
    // @ts-expect-error invalid width
    expectInvalidProps(() => renderUI(<Container width="huge">x</Container>), /width/);
    // @ts-expect-error header required
    expectInvalidProps(() => renderUI(<SiteLayout>x</SiteLayout>), /header/);
  });
});
