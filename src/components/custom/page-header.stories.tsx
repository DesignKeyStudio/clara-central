import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";

const meta: Meta<typeof PageHeader> = {
  title: "Custom/PageHeader",
  component: PageHeader,
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const TitleOnly: Story = {
  args: { title: "Dashboard" },
};

export const WithSubtitle: Story = {
  args: {
    title: "Subscriptions",
    subtitle: "Manage your organization's software subscriptions",
  },
};

export const WithActions: Story = {
  args: {
    title: "Subscriptions",
    subtitle: "Manage your organization's software subscriptions",
    actions: (
      <>
        <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
        <Button><Plus className="mr-2 h-4 w-4" />Add Subscription</Button>
      </>
    ),
  },
};

export const ManyActions: Story = {
  args: {
    title: "Subscriptions",
    subtitle: "Manage your organization's software subscriptions",
    actions: (
      <>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
        <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
        <Button><Plus className="mr-2 h-4 w-4" />Add Subscription</Button>
      </>
    ),
  },
};
