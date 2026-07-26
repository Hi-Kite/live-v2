-- AlterTable
ALTER TABLE `Stream` ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `mutedUntil` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `PkSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `streamAId` INTEGER NOT NULL,
    `streamBId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    INDEX `PkSession_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PkSession` ADD CONSTRAINT `PkSession_streamAId_fkey` FOREIGN KEY (`streamAId`) REFERENCES `Stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PkSession` ADD CONSTRAINT `PkSession_streamBId_fkey` FOREIGN KEY (`streamBId`) REFERENCES `Stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
