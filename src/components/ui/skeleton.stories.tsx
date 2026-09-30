import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Primitives/Skeleton",
  component: Skeleton,
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const CardLoading: Story = {
  render: () => (
    <div className="space-y-3 max-w-xs">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-8 w-[120px]" />
      <Skeleton className="h-3 w-[160px]" />
    </div>
  ),
};

export const TableRowLoading: Story = {
  render: () => (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  ),
};
