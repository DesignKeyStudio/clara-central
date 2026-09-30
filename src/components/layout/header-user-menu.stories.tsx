import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderUserMenu } from "./header-user-menu";

const meta: Meta<typeof HeaderUserMenu> = {
  title: "Layout/HeaderUserMenu",
  component: HeaderUserMenu,
};
export default meta;

type Story = StoryObj<typeof HeaderUserMenu>;

export const Default: Story = {
  args: {
    displayName: "Sarah Mitchell",
    displayEmail: "sarah@company.com",
    avatarInitials: "SM",
    onSignOut: () => console.log("Sign out clicked"),
  },
};

export const LongName: Story = {
  args: {
    displayName: "Alexandra Williamson-Fitzgerald",
    displayEmail: "alexandra.williamson-fitzgerald@longcompanyname.com",
    avatarInitials: "AW",
    onSignOut: () => console.log("Sign out clicked"),
  },
};

export const NoEmail: Story = {
  args: {
    displayName: "Demo User",
    displayEmail: "",
    avatarInitials: "DU",
    onSignOut: () => console.log("Sign out clicked"),
  },
};
