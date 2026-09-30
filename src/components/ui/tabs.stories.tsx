import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "Primitives/Tabs",
  component: Tabs,
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="max-w-md">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-muted-foreground p-4">Overview content</TabsContent>
      <TabsContent value="billing" className="text-sm text-muted-foreground p-4">Billing content</TabsContent>
      <TabsContent value="activity" className="text-sm text-muted-foreground p-4">Activity content</TabsContent>
    </Tabs>
  ),
};
