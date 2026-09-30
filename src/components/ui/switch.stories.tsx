import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "./switch";
import { Label } from "./label";

const meta: Meta<typeof Switch> = {
  title: "Primitives/Switch",
  component: Switch,
  argTypes: {
    disabled: { control: "boolean" },
    size: { control: "select", options: ["sm", "default"] },
  },
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch id="email-notifications" defaultChecked />
        <Label htmlFor="email-notifications">Email notifications</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="marketing" />
        <Label htmlFor="marketing">Marketing emails</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="dark-mode" defaultChecked />
        <Label htmlFor="dark-mode">Dark mode</Label>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off" className="text-muted-foreground">
          Disabled (off)
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on" className="text-muted-foreground">
          Disabled (on)
        </Label>
      </div>
    </div>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="small" size="sm" defaultChecked />
      <Label htmlFor="small">Small switch</Label>
    </div>
  ),
};
