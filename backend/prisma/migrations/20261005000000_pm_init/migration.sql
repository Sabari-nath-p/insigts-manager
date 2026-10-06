-- CreateTable
CREATE TABLE `pm_members` (
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_projects` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `color` VARCHAR(9) NOT NULL DEFAULT '#146356',
    `description` TEXT NULL,
    `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
    `nextTaskNumber` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pm_projects_key_key`(`key`),
    INDEX `pm_projects_status_idx`(`status`),
    INDEX `pm_projects_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_columns` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `position` DOUBLE NOT NULL,
    `type` ENUM('todo', 'doing', 'review', 'done') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_columns_projectId_position_idx`(`projectId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `columnId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `assigneeId` VARCHAR(191) NULL,
    `dueDate` VARCHAR(10) NULL,
    `position` DOUBLE NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_tasks_projectId_columnId_position_idx`(`projectId`, `columnId`, `position`),
    INDEX `pm_tasks_assigneeId_idx`(`assigneeId`),
    INDEX `pm_tasks_createdBy_idx`(`createdBy`),
    INDEX `pm_tasks_completedAt_idx`(`completedAt`),
    INDEX `pm_tasks_dueDate_idx`(`dueDate`),
    INDEX `pm_tasks_archivedAt_idx`(`archivedAt`),
    UNIQUE INDEX `pm_tasks_projectId_number_key`(`projectId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_labels` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `color` VARCHAR(9) NOT NULL DEFAULT '#787671',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pm_labels_projectId_name_key`(`projectId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_task_labels` (
    `taskId` VARCHAR(191) NOT NULL,
    `labelId` VARCHAR(191) NOT NULL,

    INDEX `pm_task_labels_labelId_idx`(`labelId`),
    PRIMARY KEY (`taskId`, `labelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_updates` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_updates_taskId_createdAt_idx`(`taskId`, `createdAt`),
    INDEX `pm_updates_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_activity` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_activity_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `pm_activity_taskId_createdAt_idx`(`taskId`, `createdAt`),
    INDEX `pm_activity_actorId_idx`(`actorId`),
    INDEX `pm_activity_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

