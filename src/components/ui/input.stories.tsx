import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { Label } from "./label";
import { Search } from "lucide-react";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="relative max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="Search subscriptions..." className="pl-9" />
    </div>
  ),
};

export const DateInput: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <Label>Start Date</Label>
      <Input type="date" defaultValue="2026-03-19" />
    </div>
  ),
};

export const NumberInput: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <Label>Price</Label>
      <Input type="number" step="0.01" min="0" defaultValue="99.99" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true },
};
