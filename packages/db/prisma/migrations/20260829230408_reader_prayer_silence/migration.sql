-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "locationSet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prayerOffsets" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "silenceEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "silenceWindowMinutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "PrayerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prayer" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrayerEvent" ADD CONSTRAINT "PrayerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
