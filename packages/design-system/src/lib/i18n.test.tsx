import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUI } from "../../test/utils";
import { matchSummary, stadiumMap } from "../fixtures";
import { EventCard } from "../molecules/Events";
import { Field } from "../molecules/Form";
import { Input } from "../atoms/FormControls";
import { LoginForm } from "../organisms/Account";
import { SiteHeader } from "../organisms/Header";
import { ZonePicker } from "../organisms/Seating";
import { stadiumPicked, toggleSeat } from "./seating";
import { configureUI, useI18n } from "./provider";
import { arCatalog, createFormatters, createTranslator } from "@repo/i18n";

describe("Arabic interface", () => {
  it("renders event cards with Arabic labels, Arabic dates and EGP in Arabic", () => {
    renderUI(<EventCard event={matchSummary} href="/e" />, { locale: "ar" });
    expect(screen.getByText("الدوري الممتاز")).toBeInTheDocument();
    expect(screen.getByText("من")).toBeInTheDocument();
    expect(screen.getByText(/ج\.م/)).toBeInTheDocument();
    expect(screen.getByText(/أكتوبر/)).toBeInTheDocument();
  });

  it("translates form labels and the shared validation messages", async () => {
    const { user, container } = renderUI(<LoginForm onSubmit={vi.fn()} signUpHref="/signup" />, { locale: "ar" });
    expect(screen.getByRole("heading", { name: "تسجيل الدخول" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
    await waitFor(() => expect(screen.getByText("أدخل كلمة المرور")).toBeInTheDocument());
    expect(screen.getByText(/أدخل رقم موبايل مصريًا صحيحًا/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("keeps phone numbers left-to-right inside the right-to-left page", () => {
    const { container } = renderUI(<LoginForm onSubmit={vi.fn()} signUpHref="/signup" />, { locale: "ar" });
    expect(container.querySelector('[dir="ltr"]')).toHaveTextContent("+20");
  });

  it("keeps the stadium plan geographic (never mirrored)", () => {
    renderUI(<ZonePicker zones={stadiumMap.zones} value="cat1" onValueChange={() => {}} />, { locale: "ar" });
    expect(screen.getByRole("group", { name: "مناطق الاستاد" })).toHaveAttribute("dir", "ltr");
  });

  it("opens the mobile menu from the left in Arabic", () => {
    renderUI(
      <SiteHeader links={[{ id: "m", label: "المباريات", href: "/events" }]} account={{ status: "signed_out", signInHref: "/login" }} />,
      { locale: "ar" },
    );
    expect(screen.getByRole("link", { name: "تسجيل الدخول" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "فتح القائمة" })).toBeInTheDocument();
  });

  it("wires Field ARIA through wrappers without React context", () => {
    renderUI(
      <Field label="Phone" error="Enter your password" hint="h">
        <div>
          <span>+20</span>
          <Input />
        </div>
      </Field>,
      { locale: "ar" },
    );
    const input = screen.getByLabelText("Phone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("h أدخل كلمة المرور");
  });

  it("builds seat labels in the visitor's language", () => {
    const ar = { t: createTranslator("ar", arCatalog), f: createFormatters("ar") };
    const block = { id: "W3", side: "W", sideName: "West", category: "Category 1", price: 250, rows: [], facing: "" } as never;
    expect(stadiumPicked([block], ["W3-L-18"], ar)[0]).toMatchObject({
      label: "الكتلة W3 · الصف L · المقعد 18",
      detail: "Category 1 · 250 ج.م",
    });
    expect(toggleSeat(["a"], "b", 1, "full").message).toBe("full");
  });

  it("reads the locale from the configured hook (per render, not stored)", () => {
    let current: "en" | "ar" = "en";
    configureUI({ useLocale: () => current });
    function Probe() {
      const { t, dir } = useI18n();
      return (
        <p>
          {t("Log in")} {dir}
        </p>
      );
    }
    const { rerender } = renderUI(<Probe />, { locale: "en" });
    configureUI({ useLocale: () => current });
    rerender(<Probe />);
    expect(screen.getByText("Log in ltr")).toBeInTheDocument();
    current = "ar";
    rerender(<Probe />);
    expect(screen.getByText("تسجيل الدخول rtl")).toBeInTheDocument();
  });
});
