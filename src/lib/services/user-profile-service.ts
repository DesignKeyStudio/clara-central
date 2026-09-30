import { prisma } from "@/lib/prisma";

// The auth-identity profile (a mirror of the Supabase auth user). Used by the
// admin account page — admins have no partner record, so their editable details
// live directly on `UserProfile`. Email is read-only (login identity).

/** An admin's own editable profile (email is read-only display only). */
export type AdminProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  notifyByEmail: boolean;
  notifyBySms: boolean;
};

/** Load a user's own profile for the account page, or null if missing. */
export async function getUserProfile(userId: string): Promise<AdminProfile | null> {
  return prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      notifyByEmail: true,
      notifyBySms: true,
    },
  });
}

/**
 * Update a user's own identity fields (name + phone + notification prefs). Email
 * is not editable here (it's the login identity).
 */
export async function updateUserProfile(
  userId: string,
  data: {
    fullName: string;
    phone: string | null;
    notifyByEmail: boolean;
    notifyBySms: boolean;
  },
): Promise<void> {
  await prisma.userProfile.update({ where: { id: userId }, data });
}
