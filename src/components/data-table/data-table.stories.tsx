"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { SortableHeader } from "./sortable-header";
import { ColumnVisibility } from "./column-visibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface Subscription {
  id: string;
  name: string;
  vendor: string;
  cost: number;
  status: "Active" | "Trial" | "Cancelled" | "Expired";
  renewalDate: string;
  department: string;
}

const statusVariant = (s: Subscription["status"]) => {
  switch (s) {
    case "Active":
      return "default" as const;
    case "Trial":
      return "secondary" as const;
    case "Cancelled":
      return "destructive" as const;
    case "Expired":
      return "outline" as const;
  }
};

function makeMockData(count: number): Subscription[] {
  const names = [
    "Figma", "Slack", "Notion", "Jira", "GitHub", "Linear", "Vercel",
    "AWS", "Datadog", "Sentry", "Stripe", "Intercom", "HubSpot",
    "Zoom", "1Password", "Cloudflare", "Postman", "Miro", "Loom", "Grammarly",
    "Airtable", "Monday.com", "Asana", "Trello", "Confluence",
  ];
  const vendors = [
    "Figma Inc.", "Salesforce", "Notion Labs", "Atlassian", "GitHub Inc.",
    "Linear Inc.", "Vercel Inc.", "Amazon", "Datadog Inc.", "Sentry Inc.",
    "Stripe Inc.", "Intercom Inc.", "HubSpot Inc.", "Zoom Video", "AgileBits",
    "Cloudflare Inc.", "Postman Inc.", "Miro Inc.", "Loom Inc.", "Grammarly Inc.",
    "Airtable Inc.", "Monday.com", "Asana Inc.", "Trello Inc.", "Atlassian",
  ];
  const statuses: Subscription["status"][] = ["Active", "Trial", "Cancelled", "Expired"];
  const departments = ["Engineering", "Design", "Marketing", "Sales", "Finance", "Operations"];

  return Array.from({ length: count }, (_, i) => ({
    id: `sub-${i + 1}`,
    name: names[i % names.length],
    vendor: vendors[i % vendors.length],
    cost: Math.round((5 + Math.random() * 95) * 100) / 100,
    status: statuses[i % statuses.length],
    renewalDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-15`,
    department: departments[i % departments.length],
  }));
}

const ROWS_SMALL = makeMockData(8);
const ROWS_LARGE = makeMockData(25);

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const baseColumns: ColumnDef<Subscription>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "vendor",
    header: ({ column }) => <SortableHeader column={column}>Vendor</SortableHeader>,
  },
  {
    accessorKey: "cost",
    header: ({ column }) => <SortableHeader column={column}>Cost</SortableHeader>,
    cell: ({ row }) => `$${(row.getValue("cost") as number).toFixed(2)}/mo`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Subscription["status"];
      return <Badge variant={statusVariant(status)}>{status}</Badge>;
    },
  },
  {
    accessorKey: "renewalDate",
    header: ({ column }) => <SortableHeader column={column}>Renewal</SortableHeader>,
  },
  {
    accessorKey: "department",
    header: "Department",
  },
];

const selectColumn: ColumnDef<Subscription> = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
};

const actionsColumn: ColumnDef<Subscription> = {
  id: "actions",
  header: "",
  cell: () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof DataTable<Subscription, unknown>> = {
  title: "Data Table/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof DataTable<Subscription, unknown>>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** 1. Default — sortable columns, pagination */
export const Default: Story = {
  render: () => <DataTable columns={baseColumns} data={ROWS_SMALL} pageSize={10} />,
};

/** 2. With Row Selection */
export const WithRowSelection: Story = {
  render: function Render() {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const columns = [selectColumn, ...baseColumns];
    return (
      <DataTable
        columns={columns}
        data={ROWS_SMALL}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
      />
    );
  },
};

/** 3. With Search */
export const WithSearch: Story = {
  render: function Render() {
    const [search, setSearch] = useState("");
    return (
      <DataTable
        columns={baseColumns}
        data={ROWS_SMALL}
        searchValue={search}
        renderToolbar={() => (
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}
      />
    );
  },
};

/** 4. With Column Visibility */
export const WithColumnVisibility: Story = {
  render: () => (
    <DataTable
      columns={baseColumns}
      data={ROWS_SMALL}
      showColumnVisibility
      initialColumnVisibility={{ department: false, renewalDate: false }}
      renderToolbar={(table) => (
        <div className="flex justify-end">
          <ColumnVisibility table={table} />
        </div>
      )}
    />
  ),
};

/** 5. Empty State */
export const EmptyState: Story = {
  render: () => (
    <DataTable
      columns={baseColumns}
      data={[]}
      emptyMessage="No subscriptions found. Create your first subscription to get started."
    />
  ),
};

/** 6. Loading State — skeleton rows */
export const LoadingState: Story = {
  render: () => <DataTable columns={baseColumns} data={[]} isLoading />,
};

/** 7. With Badges — status column with colored badges */
export const WithBadges: Story = {
  render: () => {
    const badgeColumns: ColumnDef<Subscription>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
      },
      { accessorKey: "vendor", header: "Vendor" },
      {
        accessorKey: "cost",
        header: "Cost",
        cell: ({ row }) => `$${(row.getValue("cost") as number).toFixed(2)}/mo`,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as Subscription["status"];
          return <Badge variant={statusVariant(status)}>{status}</Badge>;
        },
      },
    ];
    return <DataTable columns={badgeColumns} data={ROWS_SMALL} showPagination={false} />;
  },
};

/** 8. With Actions Column — edit / delete buttons */
export const WithActionsColumn: Story = {
  render: () => {
    const columns = [...baseColumns, actionsColumn];
    return <DataTable columns={columns} data={ROWS_SMALL} />;
  },
};

/** 9. Dense Data — 25 rows showing pagination controls */
export const DenseData: Story = {
  render: () => <DataTable columns={baseColumns} data={ROWS_LARGE} pageSize={10} />,
};
