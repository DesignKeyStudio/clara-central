import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Alert, AlertTitle, AlertDescription } from "./alert";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bell,
} from "lucide-react";

const meta: Meta<typeof Alert> = {
  title: "ReUI/Alert",
  component: Alert,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "info",
        "success",
        "warning",
        "destructive",
        "invert",
      ],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-lg">
      <Alert>
        <Bell className="size-4" />
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>This is a default alert.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info className="size-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>This is an informational alert.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle2 className="size-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Operation completed successfully.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="size-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please review before proceeding.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
      <Alert variant="invert">
        <Bell className="size-4" />
        <AlertTitle>Invert</AlertTitle>
        <AlertDescription>Inverted color scheme.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Alert variant="info" className="max-w-lg">
      <Info className="size-4" />
      <AlertTitle>3 subscriptions are up for renewal this week</AlertTitle>
    </Alert>
  ),
};
