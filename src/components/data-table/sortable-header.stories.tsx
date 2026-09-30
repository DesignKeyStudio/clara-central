import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { SortableHeader } from "./sortable-header";

// We render SortableHeader inside a minimal DataTable since it requires a Column context.

interface Row {
  id: string;
  name: string;
  value: number;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", value: 30 },
  { id: "2", name: "Bravo", value: 10 },
  { id: "3", name: "Charlie", value: 20 },
];

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
  },
  {
    accessorKey: "value",
    header: ({ column }) => <SortableHeader column={column}>Value</SortableHeader>,
    cell: ({ row }) => row.getValue("value"),
  },
];

const meta: Meta = {
  title: "Data Table/SortableHeader",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

/** Default — click headers to cycle through unsorted → asc → desc */
export const Default: Story = {
  render: () => (
    <DataTable columns={columns} data={rows} showPagination={false} showColumnVisibility={false} />
  ),
};
