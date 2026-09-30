import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserAvatar } from "./user-avatar";

const meta: Meta<typeof UserAvatar> = {
  title: "Custom/UserAvatar",
  component: UserAvatar,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof UserAvatar>;

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <UserAvatar initials="SC" size="sm" />
      <UserAvatar initials="AR" size="md" />
      <UserAvatar initials="JT" size="lg" />
    </div>
  ),
};

export const DemoAccounts: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <UserAvatar initials="SC" size="md" />
      <UserAvatar initials="AR" size="md" />
      <UserAvatar initials="JT" size="md" />
      <UserAvatar initials="CM" size="md" />
      <UserAvatar initials="PJ" size="md" />
    </div>
  ),
};
