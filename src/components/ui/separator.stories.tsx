import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
  title: "Primitives/Separator",
  component: Separator,
};
export default meta;

type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <p className="text-sm">Above separator</p>
      <Separator />
      <p className="text-sm">Below separator</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-4 h-8">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm">Right</span>
    </div>
  ),
};
