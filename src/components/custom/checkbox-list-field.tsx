"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface CheckboxListFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  items: { id: string; label: string }[];
}

export function CheckboxListField<T extends FieldValues>({
  control,
  name,
  label,
  items,
}: CheckboxListFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <div className="space-y-2">
            {items.map((item) => (
              <FormField
                key={item.id}
                control={control}
                name={name}
                render={({ field }) => {
                  const value = (field.value as string[]) ?? [];
                  return (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={value.includes(item.id)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...value, item.id]
                                : value.filter((id: string) => id !== item.id)
                            );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{item.label}</FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
