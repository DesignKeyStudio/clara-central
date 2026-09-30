import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KpiCard } from "./kpi-card";
import { CreditCard, DollarSign, CalendarClock, AlertTriangle } from "lucide-react";

const meta: Meta<typeof KpiCard> = {
  title: "Custom/KpiCard",
  component: KpiCard,
};
export default meta;

type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {
  args: {
    label: "Total Subscriptions",
    value: "23",
    icon: CreditCard,
  },
};

export const WithLink: Story = {
  args: {
    label: "Total Subscriptions",
    value: "23",
    icon: CreditCard,
    href: "/subscriptions",
  },
};

export const WithViewAllLink: Story = {
  args: {
    label: "Unpaid Subscriptions",
    value: "4",
    icon: AlertTriangle,
    linkLabel: "View All",
    linkHref: "/subscriptions",
    iconClassName: "bg-amber-500/10",
  },
};

export const TrendUp: Story = {
  args: {
    label: "Current Month Spend",
    value: "$12,450",
    icon: CalendarClock,
    trend: 4.6,
  },
};

export const TrendDown: Story = {
  args: {
    label: "Current Month Spend",
    value: "$10,200",
    icon: CalendarClock,
    trend: -5.2,
  },
};

export const AllKPIs: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Total Subscriptions" value="23" icon={CreditCard} href="/subscriptions" />
      <KpiCard label="Unpaid Subscriptions" value="4" icon={AlertTriangle} linkLabel="View All" linkHref="/subscriptions" iconClassName="bg-amber-500/10" />
      <KpiCard label="Annual Spend" value="$124,500" icon={DollarSign} />
      <KpiCard label="Current Month" value="$12,450" icon={CalendarClock} trend={4.6} />
    </div>
  ),
};
