import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { Input, RadioGroup } from "../atoms/FormControls";
import { CheckboxField, Field, OptionCard, OtpInput, QuantityStepper, SearchField } from "./Form";

describe("Field", () => {
  it("wires label, hint and error to the nested control", async () => {
    const { container } = renderUI(
      <Field label="Password" hint="At least 8 characters" error="Use at least 8 characters" required>
        <Input type="password" />
      </Field>,
    );
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("At least 8 characters Use at least 8 characters");
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 8 characters");
    await expectNoA11yViolations(container);
  });

  it("shows an optional label suffix", () => {
    renderUI(
      <Field label="Email" optionalLabel="(optional, for receipts)">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByText("(optional, for receipts)")).toBeInTheDocument();
  });

  it("validates props", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <Field
            label="x"
            // @ts-expect-error error must be a string
            error={42}
          >
            <Input />
          </Field>,
        ),
      /error/,
    );
  });
});

describe("CheckboxField", () => {
  it("toggles via its label and shows errors", async () => {
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <CheckboxField
          label="I agree to the terms"
          checked={checked}
          onCheckedChange={setChecked}
          error={checked ? undefined : "You need to accept"}
        />
      );
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByRole("alert")).toHaveTextContent("You need to accept");
    await user.click(screen.getByText("I agree to the terms"));
    expect(screen.getByRole("checkbox", { name: "I agree to the terms" })).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    // @ts-expect-error missing handler
    expectInvalidProps(() => renderUI(<CheckboxField label="x" checked />), /onCheckedChange/);
  });
});

describe("SearchField", () => {
  it("is controlled and labelled", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(
      <SearchField label="Search" value="" onValueChange={onChange} placeholder="Search teams, stadiums" />,
    );
    await user.type(screen.getByRole("searchbox", { name: "Search" }), "N");
    expect(onChange).toHaveBeenCalledWith("N");
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<SearchField label="" value="" onValueChange={() => {}} />), /label/);
  });
});

describe("OptionCard", () => {
  it("reveals extra content for the selected option", async () => {
    function Harness() {
      const [value, setValue] = useState("card");
      return (
        <RadioGroup aria-label="Pay with" value={value} onValueChange={setValue}>
          <OptionCard value="card" title="Debit or credit card" description="Visa, Mastercard, Meeza" selected={value === "card"}>
            <p>Card fields</p>
          </OptionCard>
          <OptionCard value="credit" title="Matchpass credit" tag="+5% bonus" tagTone="success" selected={value === "credit"}>
            <p>Credit info</p>
          </OptionCard>
        </RadioGroup>
      );
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByText("Card fields")).toBeInTheDocument();
    expect(screen.queryByText("Credit info")).not.toBeInTheDocument();
    await user.click(screen.getByText("Matchpass credit"));
    expect(screen.getByRole("radio", { name: /Matchpass credit/ })).toBeChecked();
    expect(screen.getByText("Credit info")).toBeInTheDocument();
    expect(screen.getByText("+5% bonus")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <RadioGroup aria-label="x">
            {/* @ts-expect-error selected is required */}
            <OptionCard value="a" title="A" />
          </RadioGroup>,
        ),
      /selected/,
    );
  });
});

describe("OtpInput", () => {
  function Harness({ onChange }: { onChange?: (v: string) => void }) {
    const [value, setValue] = useState("");
    return (
      <OtpInput
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
      />
    );
  }

  it("advances focus as digits are typed and ignores letters", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(<Harness onChange={onChange} />);
    await user.click(screen.getByLabelText("Digit 1"));
    await user.keyboard("4a8");
    expect(screen.getByLabelText("Digit 1")).toHaveValue("4");
    expect(screen.getByLabelText("Digit 2")).toHaveValue("8");
    expect(screen.getByLabelText("Digit 3")).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("48");
    await expectNoA11yViolations(container);
  });

  it("moves back on backspace and supports paste", async () => {
    const onChange = vi.fn();
    const { user } = renderUI(<Harness onChange={onChange} />);
    await user.click(screen.getByLabelText("Digit 1"));
    await user.keyboard("12");
    await user.keyboard("{Backspace}");
    expect(screen.getByLabelText("Digit 2")).toHaveValue("");
    fireEvent.paste(screen.getByLabelText("Digit 1"), { clipboardData: { getData: () => "123-456" } });
    expect(onChange).toHaveBeenLastCalledWith("123456");
    expect(screen.getByLabelText("Digit 6")).toHaveValue("6");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<OtpInput value="12a" onValueChange={() => {}} />), /digits/);
    expectInvalidProps(() => renderUI(<OtpInput value="" length={2} onValueChange={() => {}} />), /length/);
  });
});

describe("QuantityStepper", () => {
  it("increments and decrements within bounds", async () => {
    function Harness() {
      const [qty, setQty] = useState(0);
      return <QuantityStepper value={qty} onValueChange={setQty} itemLabel="Golden Circle" max={2} />;
    }
    const { user, container } = renderUI(<Harness />);
    const less = screen.getByRole("button", { name: "One less Golden Circle" });
    const more = screen.getByRole("button", { name: "One more Golden Circle" });
    expect(less).toBeDisabled();
    await user.click(more);
    await user.click(more);
    expect(screen.getByRole("status")).toHaveTextContent("2");
    expect(more).toBeDisabled();
    await user.click(less);
    expect(screen.getByRole("status")).toHaveTextContent("1");
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<QuantityStepper value={5} max={2} onValueChange={() => {}} itemLabel="x" />), /max/);
    expectInvalidProps(() => renderUI(<QuantityStepper value={-1} onValueChange={() => {}} itemLabel="x" />), /value/);
  });
});
