import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../molecules/Content";
import { SiteFooter, SiteHeader } from "../organisms/Header";
import { BrandPanel } from "../organisms/Account";
import { Container, SiteLayout, SplitLayout, TwoColumn } from "./Layouts";

const header = (
  <SiteHeader
    links={[{ id: "matches", label: "Matches", href: "/events" }]}
    account={{ status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/tickets" }}
  />
);
const footer = <SiteFooter tagline="Official tickets." columns={[{ title: "Fans", links: [{ label: "Matches", href: "/events" }] }]} />;

const meta = {
  title: "Templates/Layouts",
  component: SiteLayout,
  parameters: { layout: "fullscreen" },
  args: { header, footer, children: null },
} satisfies Meta<typeof SiteLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SiteWithTwoColumns: Story = {
  args: {
    children: (
      <Container className="pt-8">
        <TwoColumn asideLabel="Order summary" aside={<Card title="Aside">Sticky summary column</Card>}>
          <Card title="Main column">Primary content</Card>
          <Card title="More content">Sections stack here</Card>
        </TwoColumn>
      </Container>
    ),
  },
};

export const Split: Story = {
  render: () => (
    <SplitLayout
      panel={
        <BrandPanel title="One account for every match and every show" bullets={["Get alerts", "Pay your way"]} className="min-h-full" />
      }
    >
      <h1 className="font-display text-[44px] font-extrabold uppercase">Form goes here</h1>
    </SplitLayout>
  ),
};
