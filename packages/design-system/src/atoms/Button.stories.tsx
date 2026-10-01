import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppLink } from "./AppLink";
import { Button, buttonSizeValues, buttonVariantValues, LinkButton } from "./Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  args: { children: "Join the waiting room", variant: "primary", size: "xl" },
  argTypes: {
    variant: { control: "select", options: buttonVariantValues },
    size: { control: "select", options: buttonSizeValues },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Pitch: Story = { args: { variant: "pitch", children: "Pay 530 EGP" } };
export const Outline: Story = { args: { variant: "outline", size: "md", children: "Set reminder" } };
export const Ink: Story = { args: { variant: "ink", size: "md", children: "Show QR" } };
export const Danger: Story = { args: { variant: "outline-danger", size: "md", children: "Cancel request — keep my tickets" } };
export const Loading: Story = { args: { variant: "pitch", loading: true, loadingText: "Processing payment…", children: "Pay" } };
export const Disabled: Story = { args: { disabled: true, children: "Continue" } };
export const Icon: Story = { args: { variant: "outline", size: "icon", "aria-label": "Remove seat", children: "×" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {buttonVariantValues.map((variant) => (
        <div key={variant} className={variant === "outline-inverse" ? "rounded-lg bg-pitch p-2" : undefined}>
          <Button variant={variant}>{variant}</Button>
        </div>
      ))}
    </div>
  ),
};

export const AsLink: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <LinkButton href="/events">See all events</LinkButton>
      <LinkButton href="/checkout" disabled>
        Continue
      </LinkButton>
      <AppLink href="/events" tone="pitch">
        Inline link →
      </AppLink>
      <AppLink href="https://example.com" external underline>
        External link
      </AppLink>
    </div>
  ),
};
