import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Plus, Download, Trash2, LogOut } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Button" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus className="h-4 w-4" /></Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button><Plus className="mr-2 h-4 w-4" />Add Subscription</Button>
      <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      <Button variant="ghost"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
    </div>
  ),
};

export const BrandGradient: Story = {
  render: () => (
    <Button className="text-white" style={{ background: "linear-gradient(135deg, #3A58BE 0%, #502A99 100%)" }}>
      Sign In
    </Button>
  ),
};

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};
