import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Trial</Badge>
      <Badge variant="destructive">Cancelled</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Trial</Badge>
      <Badge variant="destructive">Cancelled</Badge>
    </div>
  ),
};

export const RoleBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">Super Admin</Badge>
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">Admin</Badge>
      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">Manager</Badge>
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">Contributor</Badge>
      <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-200">Viewer</Badge>
    </div>
  ),
};

export const RenewalBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="destructive" className="tabular-nums">3d</Badge>
      <Badge className="tabular-nums">15d</Badge>
      <Badge variant="secondary" className="tabular-nums">45d</Badge>
    </div>
  ),
};
