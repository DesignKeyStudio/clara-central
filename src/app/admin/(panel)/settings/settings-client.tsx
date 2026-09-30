"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/custom/page-header";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppConfig, useUpdateAppConfig } from "@/lib/queries/hooks";
import { appConfigSchema, type AppConfigFormData } from "@/lib/validations/app-config";

export function SettingsClient() {
  const { data: config, isLoading } = useAppConfig();
  const update = useUpdateAppConfig();
  const form = useForm<AppConfigFormData>({
    resolver: zodResolver(appConfigSchema),
    defaultValues: { standardCommissionRate: 10, commissionValidMonths: 12, payoutCadenceNote: "" },
  });

  // Populate the form once the saved config loads (or after a refetch). The cadence
  // note can be null in storage; coerce to "" so the textarea stays controlled.
  useEffect(() => {
    if (config) form.reset({ ...config, payoutCadenceNote: config.payoutCadenceNote ?? "" });
  }, [config, form]);

  const onSubmit = (values: AppConfigFormData) => {
    update.mutate(values, {
      onSuccess: () => toast.success("Settings saved"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Platform-wide commission defaults."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Commission</CardTitle>
          <CardDescription>
            The standard rate for new partners and how long a referral keeps earning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="standardCommissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard commission rate (%) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0.01} max={100} step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>
                        Applied to new partners and invitations. Existing partners keep their
                        current rate.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commissionValidMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission window (months) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={120} step="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        How long a referral earns commission from its submission date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payoutCadenceNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout cadence note</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="e.g. Commission is paid out every 2 months."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Shown to partners on their Payouts page. Leave blank to hide it.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
