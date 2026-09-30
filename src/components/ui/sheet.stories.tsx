import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta: Meta = {
  title: "Primitives/Sheet",
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>
            This is a side panel used for create and edit forms throughout the
            application.
          </SheetDescription>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">Sheet body content goes here.</p>
      </SheetContent>
    </Sheet>
  ),
};

export const WithFormContent: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Create Subscription</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Subscription</SheetTitle>
          <SheetDescription>
            Fill in the details below to create a new subscription.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="e.g. Slack, Figma" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cost">Monthly Cost</Label>
            <Input id="cost" type="number" placeholder="29.99" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Optional notes..." rows={3} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Create</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WithScrollContent: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Long Form</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Subscription</SheetTitle>
          <SheetDescription>
            Update subscription details below.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <Label htmlFor={`field-${i}`}>Field {i + 1}</Label>
              <Input id={`field-${i}`} placeholder={`Value ${i + 1}`} />
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WideVariant: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Wide Sheet</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Subscription Details</SheetTitle>
          <SheetDescription>
            Wide sheet variant for detail views with more content.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input defaultValue="Figma" />
          </div>
          <div className="grid gap-2">
            <Label>Vendor</Label>
            <Input defaultValue="Figma Inc." />
          </div>
          <div className="grid gap-2">
            <Label>Cost</Label>
            <Input defaultValue="$15.00/mo" />
          </div>
          <div className="grid gap-2">
            <Label>Renewal Date</Label>
            <Input defaultValue="2026-05-01" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
