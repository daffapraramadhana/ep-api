-- AlterEnum
ALTER TYPE "SessionKind" ADD VALUE 'MODULE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "moduleChapterId" TEXT;

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "cefr" "Cefr" NOT NULL,
    "coverFile" TEXT,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleChapter" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "lessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_slug_key" ON "Module"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleChapter_lessonId_key" ON "ModuleChapter"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleChapter_moduleId_order_key" ON "ModuleChapter"("moduleId", "order");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_moduleChapterId_fkey" FOREIGN KEY ("moduleChapterId") REFERENCES "ModuleChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleChapter" ADD CONSTRAINT "ModuleChapter_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleChapter" ADD CONSTRAINT "ModuleChapter_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
