import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DetailRow } from "./detail-row";

const meta: Meta<typeof DetailRow> = {
  title: "Custom/DetailRow",
  component: DetailRow,
};
export default meta;

type Story = StoryObj<typeof DetailRow>;

export const Default: Story = {
  args: {
    label: "Vendor",
    value: "Microsoft Corporation",
  },
};

export const WithBadge: Story = {
  args: {
    label: "Status",
    value: (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
        Active
      </span>
    ),
  },
};

export const WithLink: Story = {
  args: {
    label: "Website",
    value: (
      <a href="#" className="text-primary underline">
        https://microsoft.com
      </a>
    ),
  },
};

export const LongText: Story = {
  args: {
    label: "Description",
    value:
      "This is a very long description that should demonstrate how the component handles text truncation when the content exceeds the available space in the row layout.",
  },
};
