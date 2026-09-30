"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/custom/page-header";
import { AvatarField } from "@/components/custom/avatar-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyProfile,
  useRemoveMyAvatar,
  useUpdateMyAvatar,
  useUpdateMyProfile,
} from "@/lib/queries/hooks";
import { getInitials } from "@/lib/utils";
import {
  updatePartnerProfileSchema,
  type UpdatePartnerProfileFormData,
} from "@/lib/validations/partner";
import { formatUsPhone, isValidUsPhone } from "@/lib/validations/phone";
import { ChangeEmailDialog } from "@/components/custom/change-email-dialog";

const EMPTY: UpdatePartnerProfileFormData = {
  fullName: "",
  phone: "",
  companyName: "",
  role: "",
  location: "",
  website: "",
  notifyByEmail: true,
  notifyBySms: false,
};

export function PartnerProfileClient() {
  const { data, isLoading } = useMyProfile();
  const update = useUpdateMyProfile();
  const updateAvatar = useUpdateMyAvatar();
  const removeAvatar = useRemoveMyAvatar();
  // The account action returns a role-tagged union; this page only renders for partners.
  const profile = data?.kind === "partner" ? data : null;

  const onSelectAvatar = (file: File) =>
    updateAvatar.mutate(file, {
      onSuccess: () => toast.success("Profile picture updated"),
      onError: (e) => toast.error(e.message),
    });
  const onRemoveAvatar = () =>
    removeAvatar.mutate(undefined, {
      onSuccess: () => toast.success("Profile picture removed"),
      onError: (e) => toast.error(e.message),
    });

  const form = useForm<UpdatePartnerProfileFormData>({
    resolver: zodResolver(updatePartnerProfileSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName,
        // Mask a valid stored number to (555) 555-5555; leave anything else raw so
        // a legacy/out-of-format value surfaces the validation error to fix.
        phone: isValidUsPhone(profile.phone) ? formatUsPhone(profile.phone) : profile.phone,
        companyName: profile.companyName,
        role: profile.role,
        location: profile.location,
        website: profile.website,
        notifyByEmail: profile.notifyByEmail,
        notifyBySms: profile.notifyBySms,
      });
    }
  }, [profile, form]);

  const onSubmit = (values: UpdatePartnerProfileFormData) => {
    update.mutate(values, {
      onSuccess: () => toast.success("Profile updated"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your contact details and notification preferences." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            Keep your information current so we can reach you about referrals and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !profile ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile picture — uploaded straight to the public avatars bucket. */}
                <div className="space-y-2">
                  <Label>Profile picture</Label>
                  <AvatarField
                    currentUrl={profile.avatarUrl}
                    initials={getInitials(profile.fullName || profile.email)}
                    onSelect={onSelectAvatar}
                    onRemove={onRemoveAvatar}
                    uploading={updateAvatar.isPending || removeAvatar.isPending}
                  />
                </div>

                {/* Email is the login identity — changed via the confirm-by-code dialog. */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="flex-1"
                    />
                    <ChangeEmailDialog currentEmail={profile.email} disabled={profile.isDemo} />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    {profile.isDemo
                      ? "Your email is used to sign in. Changing it isn't available in the demo."
                      : "Your email is used to sign in. Changing it requires confirming the new address with a code."}
                  </p>
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
                </div>

                <div className="space-y-3 border-t pt-6">
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-[0.8rem] text-muted-foreground">
                      How would you like to hear about referral and payout updates?
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="notifyByEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer font-normal">Email</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notifyBySms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer font-normal">SMS</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

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
