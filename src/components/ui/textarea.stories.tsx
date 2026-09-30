import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./textarea";
import { Label } from "./label";

const meta: Meta<typeof Textarea> = {
  title: "Primitives/Textarea",
  component: Textarea,
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2 max-w-md">
      <Label>Notes</Label>
      <Textarea placeholder="Additional notes about this subscription..." className="min-h-[80px]" />
    </div>
  ),
};
