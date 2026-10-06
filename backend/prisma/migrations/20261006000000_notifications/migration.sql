-- CreateTable
CREATE TABLE `app_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(500) NULL,
    `link` VARCHAR(300) NULL,
    `actorId` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `app_notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `app_notifications_actorId_type_createdAt_idx`(`actorId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpointHash` CHAR(64) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` VARCHAR(200) NOT NULL,
    `auth` VARCHAR(100) NOT NULL,
    `userAgent` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `push_subscriptions_endpointHash_key`(`endpointHash`),
    INDEX `push_subscriptions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

