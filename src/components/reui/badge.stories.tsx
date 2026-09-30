import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "ReUI/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "outline",
        "info",
        "success",
        "warning",
        "destructive",
        "invert",
        "primary-light",
        "success-light",
        "warning-light",
        "info-light",
        "destructive-light",
      ],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "default", "lg", "xl"],
    },
    radius: {
      control: "select",
      options: ["default", "full"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const SemanticVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="default">Primary</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="invert">Invert</Badge>
    </div>
  ),
};

export const LightVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="primary-light">Primary</Badge>
      <Badge variant="info-light">Info</Badge>
      <Badge variant="success-light">Success</Badge>
      <Badge variant="warning-light">Warning</Badge>
      <Badge variant="destructive-light">Destructive</Badge>
      <Badge variant="invert-light">Invert</Badge>
    </div>
  ),
};

export const OutlineVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="primary-outline">Primary</Badge>
      <Badge variant="info-outline">Info</Badge>
      <Badge variant="success-outline">Success</Badge>
      <Badge variant="warning-outline">Warning</Badge>
      <Badge variant="destructive-outline">Destructive</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge size="xs">XS</Badge>
      <Badge size="sm">SM</Badge>
      <Badge size="default">Default</Badge>
      <Badge size="lg">LG</Badge>
      <Badge size="xl">XL</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  name: "Subscription Statuses",
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="success-light" radius="full">Active</Badge>
      <Badge variant="info-light" radius="full">Trial</Badge>
      <Badge variant="warning-light" radius="full">Pending</Badge>
      <Badge variant="destructive-light" radius="full">Cancelled</Badge>
      <Badge variant="invert-light" radius="full">Expired</Badge>
    </div>
  ),
};
