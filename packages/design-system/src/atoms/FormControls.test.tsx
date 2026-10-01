import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { Checkbox, Input, Label, NativeSelect, RadioGroup, RadioItem, Slider, Textarea } from "./FormControls";

describe("Input", () => {
  it("accepts typing and marks invalid state", async () => {
    const { user } = renderUI(
      <>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" invalid />
      </>,
    );
    const input = screen.getByLabelText("Full name");
    await user.type(input, "Omar Khaled");
    expect(input).toHaveValue("Omar Khaled");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("supports monospace inputs and is accessible", async () => {
    const { container } = renderUI(
      <>
        <Label htmlFor="card">Card number</Label>
        <Input id="card" mono inputMode="numeric" />
      </>,
    );
    expect(screen.getByLabelText("Card number").className).toContain("font-mono");
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    // @ts-expect-error unsupported type
    expectInvalidProps(() => renderUI(<Input type="color" aria-label="x" />), /type/);
  });
});

describe("Textarea", () => {
  it("renders and validates", async () => {
    const { container, user } = renderUI(<Textarea aria-label="Tell us more" />);
    await user.type(screen.getByLabelText("Tell us more"), "Plans changed");
    expect(screen.getByLabelText("Tell us more")).toHaveValue("Plans changed");
    await expectNoA11yViolations(container);
    // @ts-expect-error invalid must be boolean
    expectInvalidProps(() => renderUI(<Textarea aria-label="x" invalid="yes" />), /invalid/);
  });
});

describe("Checkbox", () => {
  function Controlled() {
    const [checked, setChecked] = useState(false);
    return (
      <>
        <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="terms">I agree to the terms</Label>
      </>
    );
  }

  it("is controlled and toggles via its label", async () => {
    const { user, container } = renderUI(<Controlled />);
    const box = screen.getByRole("checkbox", { name: "I agree to the terms" });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText("I agree to the terms"));
    expect(box).toBeChecked();
    await user.keyboard(" ");
    expect(box).not.toBeChecked();
    await expectNoA11yViolations(container);
  });

  it("reports boolean values only", async () => {
    const onChange = vi.fn();
    const { user } = renderUI(<Checkbox aria-label="SMS" checked={false} onCheckedChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("validates props", () => {
    // @ts-expect-error string is not a valid checked value
    expectInvalidProps(() => renderUI(<Checkbox aria-label="x" checked="yes" />), /checked/);
  });
});

describe("RadioGroup", () => {
  it("selects with click and arrow keys", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState("card");
      return (
        <RadioGroup
          aria-label="Pay with"
          value={value}
          onValueChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        >
          {["card", "wallet", "fawry"].map((v) => (
            <div key={v} className="flex gap-2">
              <RadioItem value={v} id={v} />
              <Label htmlFor={v}>{v}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByRole("radio", { name: "card" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "wallet" }));
    expect(onChange).toHaveBeenLastCalledWith("wallet");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "fawry" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "fawry" })).toBeChecked();
    await expectNoA11yViolations(container);
  });

  it("validates items", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <RadioGroup aria-label="x">
            <RadioItem value="" />
          </RadioGroup>,
        ),
      /value/,
    );
  });
});

describe("NativeSelect", () => {
  it("renders options and changes value", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(
      <NativeSelect
        aria-label="Ticket to sell"
        defaultValue="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Seat 18" },
          { value: "b", label: "Seat 19" },
        ]}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Ticket to sell"), "b");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText("Ticket to sell")).toHaveValue("b");
    await expectNoA11yViolations(container);
  });

  it("requires at least one option", () => {
    expectInvalidProps(() => renderUI(<NativeSelect aria-label="x" options={[]} />), /options/);
  });
});

describe("Slider", () => {
  it("is keyboard operable and announces value text", async () => {
    function Harness() {
      const [value, setValue] = useState(250);
      return (
        <Slider
          aria-label="Your price"
          aria-valuetext={`${value} EGP`}
          min={50}
          max={250}
          step={5}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    const { user, container } = renderUI(<Harness />);
    const thumb = screen.getByRole("slider", { name: "Your price" });
    expect(thumb).toHaveAttribute("aria-valuenow", "250");
    thumb.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(thumb).toHaveAttribute("aria-valuenow", "240");
    expect(thumb).toHaveAttribute("aria-valuetext", "240 EGP");
    await expectNoA11yViolations(container);
  });

  it("validates range and naming", () => {
    expectInvalidProps(() => renderUI(<Slider aria-label="x" min={10} max={5} value={7} onValueChange={() => {}} />), /max/);
    expectInvalidProps(() => renderUI(<Slider aria-label="x" min={0} max={5} value={7} onValueChange={() => {}} />), /value/);
    expectInvalidProps(() => renderUI(<Slider min={0} max={5} value={3} onValueChange={() => {}} />), /accessible name/);
  });
});
