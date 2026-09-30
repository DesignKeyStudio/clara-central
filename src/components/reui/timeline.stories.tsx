import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Timeline,
  TimelineItem,
  TimelineIndicator,
  TimelineSeparator,
  TimelineTitle,
  TimelineContent,
  TimelineDate,
} from "./timeline";

const meta: Meta<typeof Timeline> = {
  title: "ReUI/Timeline",
  component: Timeline,
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const ActivityLog: Story = {
  render: () => (
    <Timeline defaultValue={4}>
      <TimelineItem step={1}>
        <TimelineIndicator />
        <TimelineSeparator />
        <TimelineDate>Mar 28, 2026</TimelineDate>
        <TimelineTitle>Subscription created</TimelineTitle>
        <TimelineContent>
          Adobe Creative Cloud added by Daniel K.
        </TimelineContent>
      </TimelineItem>
      <TimelineItem step={2}>
        <TimelineIndicator />
        <TimelineSeparator />
        <TimelineDate>Mar 27, 2026</TimelineDate>
        <TimelineTitle>Request approved</TimelineTitle>
        <TimelineContent>
          Approved by Sarah M. — &quot;Looks good, proceed.&quot;
        </TimelineContent>
      </TimelineItem>
      <TimelineItem step={3}>
        <TimelineIndicator />
        <TimelineSeparator />
        <TimelineDate>Mar 26, 2026</TimelineDate>
        <TimelineTitle>Request submitted</TimelineTitle>
        <TimelineContent>
          New subscription request by John D.
        </TimelineContent>
      </TimelineItem>
      <TimelineItem step={4}>
        <TimelineIndicator />
        <TimelineSeparator />
        <TimelineDate>Mar 25, 2026</TimelineDate>
        <TimelineTitle>Department updated</TimelineTitle>
        <TimelineContent>
          Engineering department renamed from &quot;Dev Team&quot;.
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};

export const ApprovalChain: Story = {
  render: () => (
    <Timeline defaultValue={2}>
      <TimelineItem step={1}>
        <TimelineIndicator className="border-success bg-success/20" />
        <TimelineSeparator className="bg-success" />
        <TimelineTitle>Submitted</TimelineTitle>
        <TimelineContent>Request submitted by John D.</TimelineContent>
        <TimelineDate>Mar 25, 2026 9:00 AM</TimelineDate>
      </TimelineItem>
      <TimelineItem step={2}>
        <TimelineIndicator className="border-success bg-success/20" />
        <TimelineSeparator />
        <TimelineTitle>Manager Approved</TimelineTitle>
        <TimelineContent>Approved by Sarah M.</TimelineContent>
        <TimelineDate>Mar 26, 2026 2:30 PM</TimelineDate>
      </TimelineItem>
      <TimelineItem step={3}>
        <TimelineIndicator />
        <TimelineSeparator />
        <TimelineTitle>Admin Review</TimelineTitle>
        <TimelineContent>Pending admin approval.</TimelineContent>
      </TimelineItem>
    </Timeline>
  ),
};
