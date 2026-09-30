import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { CheckboxListField } from "./checkbox-list-field";

const items = [
  { id: "eng", label: "Engineering" },
  { id: "mkt", label: "Marketing" },
  { id: "fin", label: "Finance" },
  { id: "hr", label: "Human Resources" },
  { id: "ops", label: "Operations" },
];

const meta: Meta<typeof CheckboxListField> = {
  title: "Custom/CheckboxListField",
  component: CheckboxListField,
};
export default meta;

type Story = StoryObj<typeof CheckboxListField>;

function Wrapper({
  defaultValues,
  itemList,
}: {
  defaultValues: string[];
  itemList: { id: string; label: string }[];
}) {
  const form = useForm<{ departments: string[] }>({
    defaultValues: { departments: defaultValues },
  });
  return (
    <Form {...form}>
      <form className="w-80">
        <CheckboxListField
          control={form.control}
          name="departments"
          label="Departments"
          items={itemList}
        />
      </form>
    </Form>
  );
}

export const Default: Story = {
  render: () => <Wrapper defaultValues={[]} itemList={items} />,
};

export const SomeSelected: Story = {
  render: () => (
    <Wrapper defaultValues={["eng", "fin"]} itemList={items} />
  ),
};

export const AllSelected: Story = {
  render: () => (
    <Wrapper
      defaultValues={items.map((i) => i.id)}
      itemList={items}
    />
  ),
};

export const EmptyList: Story = {
  render: () => <Wrapper defaultValues={[]} itemList={[]} />,
};
