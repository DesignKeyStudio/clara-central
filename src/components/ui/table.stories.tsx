import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table";
import { Badge } from "./badge";
import { InboxIcon } from "lucide-react";

const meta: Meta = {
  title: "Primitives/Table",
};
export default meta;

type Story = StoryObj;

const sampleData = [
  { name: "Figma", vendor: "Figma Inc.", cost: "$15.00/mo", status: "Active" },
  { name: "Slack", vendor: "Salesforce", cost: "$8.75/mo", status: "Active" },
  { name: "Notion", vendor: "Notion Labs", cost: "$10.00/mo", status: "Trial" },
  { name: "Jira", vendor: "Atlassian", cost: "$7.50/mo", status: "Cancelled" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleData.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>{row.vendor}</TableCell>
            <TableCell>{row.cost}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithVaryingWidths: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Name</TableHead>
          <TableHead className="w-[200px]">Vendor</TableHead>
          <TableHead className="w-[120px] text-right">Monthly Cost</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleData.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-muted-foreground">{row.vendor}</TableCell>
            <TableCell className="text-right">{row.cost}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithBadges: Story = {
  render: () => {
    const statusVariant = (status: string) => {
      switch (status) {
        case "Active":
          return "default" as const;
        case "Trial":
          return "secondary" as const;
        case "Cancelled":
          return "destructive" as const;
        default:
          return "outline" as const;
      }
    };

    return (
      <Table>
        <TableCaption>A list of your subscriptions.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.vendor}</TableCell>
              <TableCell className="text-right">{row.cost}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <InboxIcon className="h-8 w-8" />
              <p>No subscriptions found.</p>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
