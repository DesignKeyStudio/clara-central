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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarField } from "@/components/custom/avatar-field";
import {
  ActionFieldError,
  useRemovePartnerAvatar,
  useSetPartnerAvatar,
  useUpdatePartner,
} from "@/lib/queries/hooks";
import type { PartnerDetail } from "@/lib/services/partner-service";
import { getInitials } from "@/lib/utils";
import { updatePartnerSchema, type UpdatePartnerFormData } from "@/lib/validations/partner";
import { formatUsPhone, isValidUsPhone } from "@/lib/validations/phone";

function toDefaults(p: PartnerDetail): UpdatePartnerFormData {
  return {
    fullName: p.fullName,
    email: p.email,
    // Mask a valid stored number to (555) 555-5555; leave anything else raw so a
    // legacy/out-of-format value surfaces the validation error to fix.
    phone: isValidUsPhone(p.phone ?? "") ? formatUsPhone(p.phone ?? "") : (p.phone ?? ""),
    companyName: p.companyName ?? "",
    role: p.role ?? "",
    location: p.location ?? "",
    website: p.website ?? "",
    commissionRate: p.commissionRate,
  };
}

export function EditPartnerDialog({
  partner,
  open,
  onOpenChange,
}: {
  partner: PartnerDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdatePartner(partner.id);
  const setAvatar = useSetPartnerAvatar(partner.id);
  const removeAvatar = useRemovePartnerAvatar(partner.id);
  const form = useForm<UpdatePartnerFormData>({
    resolver: zodResolver(updatePartnerSchema),
    defaultValues: toDefaults(partner),
  });

  // Refresh form values whenever the dialog opens (or the partner refetches).
  useEffect(() => {
    if (open) form.reset(toDefaults(partner));
  }, [open, partner, form]);

  const onSubmit = (values: UpdatePartnerFormData) => {
    update.mutate(values, {
      onSuccess: () => {
        toast.success("Partner updated");
        onOpenChange(false);
      },
      onError: (e) => {
        // A duplicate-email error binds inline under the email field; others toast.
        if (e instanceof ActionFieldError && e.field === "email") {
          form.setError("email", { type: "server", message: e.message });
        } else {
          toast.error(e.message);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit partner</DialogTitle>
          <DialogDescription>Update {partner.fullName}&apos;s details.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Profile picture</Label>
              <AvatarField
                currentUrl={partner.avatarUrl}
                initials={getInitials(partner.fullName || partner.email)}
                uploading={setAvatar.isPending || removeAvatar.isPending}
                onSelect={(file) =>
                  setAvatar.mutate(file, {
                    onSuccess: () => toast.success("Profile picture updated"),
                    onError: (e) => toast.error(e.message),
                  })
                }
                onRemove={() =>
                  removeAvatar.mutate(undefined, {
                    onSuccess: () => toast.success("Profile picture removed"),
                    onError: (e) => toast.error(e.message),
                  })
                }
              />
            </div>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" disabled {...field} />
                  </FormControl>
                  <FormDescription>Email address can&apos;t be changed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 items-start gap-x-4 gap-y-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="(555) 555-5555"
                        {...field}
                        onChange={(e) => field.onChange(formatUsPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / organization</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role / position</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission rate (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0.01} max={100} step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Applies to referrals submitted from now on. Existing referrals keep the rate
                      they were created at.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
