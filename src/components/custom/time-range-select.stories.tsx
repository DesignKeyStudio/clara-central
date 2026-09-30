import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TimeRangeSelect } from "./time-range-select";
import { withinTimeRange, type TimeRange } from "@/lib/utils";

const meta: Meta<typeof TimeRangeSelect> = {
  title: "Custom/TimeRangeSelect",
  component: TimeRangeSelect,
};
export default meta;

type Story = StoryObj<typeof TimeRangeSelect>;

export const Default: Story = {
  render: () => {
    const [range, setRange] = useState<TimeRange>("any");
    return <TimeRangeSelect value={range} onChange={setRange} />;
  },
};

export const Preselected: Story = {
  render: () => {
    const [range, setRange] = useState<TimeRange>("30d");
    return (
      <TimeRangeSelect value={range} onChange={setRange} ariaLabel="Filter payouts by time" />
    );
  },
};

/** Shows the pairing with `withinTimeRange` — the filter a list toolbar actually applies. */
export const FilteringRows: Story = {
  render: () => {
    const [range, setRange] = useState<TimeRange>("any");
    const today = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const rows = [
      { label: "Today", date: daysAgo(0) },
      { label: "3 days ago", date: daysAgo(3) },
      { label: "20 days ago", date: daysAgo(20) },
      { label: "60 days ago", date: daysAgo(60) },
      { label: "200 days ago", date: daysAgo(200) },
    ];
    const visible = rows.filter((r) => withinTimeRange(r.date, range));

    return (
      <div className="w-80 space-y-3">
        <TimeRangeSelect value={range} onChange={setRange} />
        <p className="text-sm text-muted-foreground">
          {visible.length} of {rows.length}
        </p>
        <ul className="space-y-1 text-sm">
          {visible.map((r) => (
            <li key={r.label} className="flex justify-between">
              <span>{r.label}</span>
              <span className="text-muted-foreground">{r.date}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
};
