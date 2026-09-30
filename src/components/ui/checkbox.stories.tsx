import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta: Meta<typeof Checkbox> = {
  title: "Primitives/Checkbox",
  component: Checkbox,
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const CheckboxList: Story = {
  render: () => (
    <div className="space-y-3">
      <Label>Departments</Label>
      {["Technology Services", "Curriculum & Instruction", "Business Office", "Human Resources"].map((dept) => (
        <div key={dept} className="flex items-center space-x-2">
          <Checkbox id={dept} />
          <Label htmlFor={dept} className="font-normal">{dept}</Label>
        </div>
      ))}
    </div>
  ),
};
