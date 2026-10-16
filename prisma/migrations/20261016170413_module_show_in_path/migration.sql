-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "showInPath" BOOLEAN NOT NULL DEFAULT false;

-- Modul EFTL (PDF klien, konteks Tour Leader) ikut Perjalanan & sesi harian.
UPDATE "Module" SET "showInPath" = true WHERE "slug" LIKE 'eftl-%';
