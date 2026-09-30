import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GradientProgressBar } from "./gradient-progress-bar";

const meta: Meta<typeof GradientProgressBar> = {
  title: "Custom/GradientProgressBar",
  component: GradientProgressBar,
};
export default meta;

type Story = StoryObj<typeof GradientProgressBar>;

export const Default: Story = {
  args: {
    label: "Next 30 days",
    formattedValue: "$4,500",
    value: 45,
  },
};

export const SpendWindows: Story = {
  render: () => (
    <div className="space-y-3 max-w-md">
      <GradientProgressBar label="Next 30 days" formattedValue="$4,500" value={33} />
      <GradientProgressBar label="Next 60 days" formattedValue="$8,200" value={60} />
      <GradientProgressBar label="Next 90 days" formattedValue="$13,600" value={100} />
    </div>
  ),
};

export const VendorSpend: Story = {
  render: () => (
    <div className="space-y-3 max-w-md">
      <GradientProgressBar label="Microsoft" formattedValue="$45,000" value={100} />
      <GradientProgressBar label="Google" formattedValue="$32,000" value={71} />
      <GradientProgressBar label="Adobe" formattedValue="$18,500" value={41} />
      <GradientProgressBar label="Zoom" formattedValue="$8,400" value={19} />
    </div>
  ),
};
