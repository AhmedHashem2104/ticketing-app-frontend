import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox, Input, Label, NativeSelect, RadioGroup, RadioItem, Slider, Textarea } from "./FormControls";

const meta = {
  title: "Atoms/Form controls",
  component: Input,
  args: { "aria-label": "Full name", placeholder: "Omar Khaled" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: "123", "aria-label": "Mobile number" } };
export const Monospace: Story = { args: { mono: true, placeholder: "1234 5678 9012 3456", "aria-label": "Card number" } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: "2 98 •••• •••• 21", mono: true, "aria-label": "ID number" } };

export const TextArea: Story = {
  render: () => <Textarea aria-label="Tell us more" rows={3} placeholder="Optional" className="max-w-md" />,
};

function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
      <Label htmlFor="terms">I agree to the terms of sale</Label>
    </div>
  );
}
export const CheckboxControl: Story = { render: () => <CheckboxDemo /> };

function RadioDemo() {
  const [value, setValue] = useState("card");
  return (
    <RadioGroup aria-label="Pay with" value={value} onValueChange={setValue}>
      {["card", "wallet", "instapay"].map((v) => (
        <div key={v} className="flex items-center gap-2.5">
          <RadioItem value={v} id={`pay-${v}`} />
          <Label htmlFor={`pay-${v}`}>{v}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
export const Radio: Story = { render: () => <RadioDemo /> };

export const Select: Story = {
  render: () => (
    <NativeSelect
      aria-label="Ticket to sell"
      className="max-w-md"
      options={[
        { value: "a", label: "Nile FC vs Delta SC · Seat 18" },
        { value: "b", label: "Layla Nour Live · Golden Circle" },
      ]}
    />
  ),
};

function SliderDemo() {
  const [price, setPrice] = useState(250);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <span className="font-semibold">{price} EGP</span>
      <Slider aria-label="Your price" aria-valuetext={`${price} EGP`} min={50} max={250} step={5} value={price} onValueChange={setPrice} />
    </div>
  );
}
export const PriceSlider: Story = { render: () => <SliderDemo /> };
