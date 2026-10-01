import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Input, RadioGroup } from "../atoms/FormControls";
import { CheckboxField, Field, OptionCard, OtpInput, QuantityStepper, SearchField } from "./Form";

const meta = {
  title: "Molecules/Form",
  component: Field,
  args: { label: "Password", hint: "At least 8 characters", children: <Input type="password" /> },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FieldWithHint: Story = {};
export const FieldWithError: Story = {
  args: {
    label: "Card number",
    error: "This card number isn't valid",
    hint: undefined,
    children: <Input mono defaultValue="4242 4242 4242 4241" />,
  },
};
export const OptionalField: Story = {
  args: { label: "Email", optionalLabel: "(optional, for receipts)", hint: undefined, children: <Input type="email" /> },
};

function CheckboxFieldDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex max-w-md flex-col gap-4">
      <CheckboxField
        label="I agree to the terms of use and privacy policy"
        checked={checked}
        onCheckedChange={setChecked}
        error={checked ? undefined : "You need to accept the terms to continue"}
      />
      <CheckboxField
        tone="warning"
        label="I understand that once the refund is approved these tickets are cancelled."
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  );
}
export const Checkboxes: Story = { render: () => <CheckboxFieldDemo /> };

function SearchDemo() {
  const [value, setValue] = useState("");
  return (
    <SearchField label="Search events" value={value} onValueChange={setValue} placeholder="Search teams, stadiums" className="max-w-sm" />
  );
}
export const Search: Story = { render: () => <SearchDemo /> };

function OptionCardsDemo() {
  const [value, setValue] = useState("card");
  return (
    <RadioGroup aria-label="Pay with" value={value} onValueChange={setValue} className="max-w-lg gap-2.5">
      <OptionCard value="card" title="Debit or credit card" description="Visa, Mastercard, Meeza" selected={value === "card"} size="lg">
        <p className="text-sm text-sub">Card fields appear here.</p>
      </OptionCard>
      <OptionCard value="wallet" title="Mobile wallet" description="Pay from your phone wallet" selected={value === "wallet"} size="lg" />
      <OptionCard
        value="credit"
        title="Matchpass credit"
        description="Use it on any event"
        tag="+5% bonus"
        tagTone="success"
        selected={value === "credit"}
        size="lg"
      />
    </RadioGroup>
  );
}
export const OptionCards: Story = { render: () => <OptionCardsDemo /> };

function OtpDemo() {
  const [value, setValue] = useState("482");
  return <OtpInput value={value} onValueChange={setValue} className="max-w-sm" />;
}
export const Otp: Story = { render: () => <OtpDemo /> };

function StepperDemo() {
  const [value, setValue] = useState(2);
  return <QuantityStepper value={value} onValueChange={setValue} itemLabel="Golden Circle" max={8} />;
}
export const Quantity: Story = { render: () => <StepperDemo /> };
