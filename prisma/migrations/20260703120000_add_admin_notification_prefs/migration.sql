-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "notify_by_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_by_sms" BOOLEAN NOT NULL DEFAULT false;
