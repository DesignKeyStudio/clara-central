import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { ColumnVisibility } from "./column-visibility";
import { SortableHeader } from "./sortable-header";

interface Row {
  id: string;
  name: string;
  vendor: string;
  cost: string;
  department: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Figma", vendor: "Figma Inc.", cost: "$15/mo", department: "Design", status: "Active" },
  { id: "2", name: "Slack", vendor: "Salesforce", cost: "$8/mo", department: "Engineering", status: "Active" },
  { id: "3", name: "Notion", vendor: "Notion Labs", cost: "$10/mo", department: "Marketing", status: "Trial" },
];

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  { accessorKey: "vendor", header: "Vendor" },
  { accessorKey: "cost", header: "Cost" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "status", header: "Status" },
];

const meta: Meta = {
  title: "Data Table/ColumnVisibility",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

/** All columns visible — click the Columns dropdown to toggle */
export const AllVisible: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={rows}
      showPagination={false}
      showColumnVisibility
      renderToolbar={(table) => (
        <div className="flex justify-end">
          <ColumnVisibility table={table} />
        </div>
      )}
    />
  ),
};

/** Some columns hidden by default */
export const SomeHidden: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={rows}
      showPagination={false}
      showColumnVisibility
      initialColumnVisibility={{ department: false, cost: false }}
      renderToolbar={(table) => (
        <div className="flex justify-end">
          <ColumnVisibility table={table} />
        </div>
      )}
    />
  ),
};
