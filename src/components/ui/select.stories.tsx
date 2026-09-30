import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Label } from "./label";

const meta: Meta<typeof Select> = {
  title: "Primitives/Select",
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>Status</Label>
      <Select defaultValue="active">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithPlaceholder: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>Vendor</Label>
      <Select>
        <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="v1">Microsoft</SelectItem>
          <SelectItem value="v2">Google</SelectItem>
          <SelectItem value="v3">Adobe</SelectItem>
          <SelectItem value="v4">Zoom</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const BillingCycles: Story = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <Label>Billing Cycle</Label>
      <Select defaultValue="annual">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="quarterly">Quarterly</SelectItem>
          <SelectItem value="semi_annual">Semi-Annual</SelectItem>
          <SelectItem value="annual">Annual</SelectItem>
          <SelectItem value="two_year">2-Year</SelectItem>
          <SelectItem value="three_year">3-Year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
