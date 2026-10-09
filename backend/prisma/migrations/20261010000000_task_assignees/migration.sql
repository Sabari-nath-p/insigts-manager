-- CreateTable
CREATE TABLE `pm_task_assignees` (
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pm_task_assignees_userId_idx`(`userId`),
    PRIMARY KEY (`taskId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Every task keeps the assignee it already had.
INSERT INTO `pm_task_assignees` (`taskId`, `userId`)
SELECT `id`, `assigneeId` FROM `pm_tasks` WHERE `assigneeId` IS NOT NULL;
