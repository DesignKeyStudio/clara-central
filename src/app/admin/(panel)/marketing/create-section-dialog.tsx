"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateSection } from "@/lib/queries/hooks";
import { createSectionSchema, type CreateSectionFormData } from "@/lib/validations/marketing";

export function CreateSectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateSection();
  const form = useForm<CreateSectionFormData>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    if (open) form.reset({ title: "" });
  }, [open, form]);

  const onSubmit = (values: CreateSectionFormData) => {
    create.mutate(values, {
      onSuccess: () => {
        toast.success("Section created");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add section</DialogTitle>
          <DialogDescription>
            Group related marketing materials under a heading partners will see.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Case Studies" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add Section"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
