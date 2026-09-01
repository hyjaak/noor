-- AlterTable
ALTER TABLE "PrayerEvent" ADD COLUMN     "payload" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "rakahCount" INTEGER;
