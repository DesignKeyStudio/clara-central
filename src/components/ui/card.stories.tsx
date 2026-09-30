import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Card content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const KPIStyle: Story = {
  render: () => (
    <Card className="gap-0 py-5 max-w-xs">
      <CardContent className="px-5">
        <p className="text-[13px] font-medium text-muted-foreground">Annual Spend</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">$124,500</p>
        <p className="mt-1 text-xs text-muted-foreground">$10,375/mo average</p>
      </CardContent>
    </Card>
  ),
};

export const FormSection: Story = {
  render: () => (
    <Card className="max-w-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Form fields would go here, organized in a grid layout.
      </CardContent>
    </Card>
  ),
};
