import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { todayLocalDate } from "@/lib/utils";
import { DatePicker } from "./date-picker";

const meta: Meta<typeof DatePicker> = {
  title: "Custom/DatePicker",
  component: DatePicker,
};
export default meta;

type Story = StoryObj<typeof DatePicker>;

/** Plain controlled-state wrapper (mirrors the inline "Mark paid" dialog usage). */
function StateWrapper(props: Omit<React.ComponentProps<typeof DatePicker>, "value" | "onChange"> & { initial?: string }) {
  const { initial = "", ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <div className="w-72 space-y-2">
      <DatePicker value={value} onChange={setValue} {...rest} />
      <p className="text-xs text-muted-foreground">value: {value || "(empty)"}</p>
    </div>
  );
}

/** React Hook Form wrapper (mirrors the add/edit invoice dialogs). */
function FormWrapper({ initial }: { initial: string }) {
  const form = useForm<{ issuedDate: string }>({ defaultValues: { issuedDate: initial } });
  return (
    <Form {...form}>
      <form className="w-72">
        <FormField
          control={form.control}
          name="issuedDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issued date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export const Default: Story = {
  render: () => <StateWrapper />,
};

export const Preselected: Story = {
  render: () => <StateWrapper initial="2026-06-09" />,
};

/** `max` caps selection at today; future days are disabled, today stays selectable. */
export const MaxToday: Story = {
  render: () => <StateWrapper initial="" max={todayLocalDate()} />,
};

export const Clearable: Story = {
  render: () => <StateWrapper initial="2026-06-09" clearable />,
};

export const DropdownNavOff: Story = {
  render: () => <StateWrapper initial="2026-06-09" withDropdownNav={false} />,
};

export const Disabled: Story = {
  render: () => <StateWrapper initial="2026-06-09" disabled />,
};

export const InForm: Story = {
  render: () => <FormWrapper initial="2026-06-09" />,
};
