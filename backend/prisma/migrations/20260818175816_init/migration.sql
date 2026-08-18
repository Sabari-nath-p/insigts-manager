-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `role` ENUM('super_admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    `workingType` ENUM('fixed', 'flexible') NOT NULL DEFAULT 'fixed',
    `designation` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `joiningDate` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `fixedHoursPerDay` DOUBLE NULL,
    `fixedStartTime` VARCHAR(5) NULL,
    `fixedEndTime` VARCHAR(5) NULL,
    `workingDays` JSON NULL,
    `flexibleMonthlyHours` DOUBLE NULL,
    `currentSalary` VARCHAR(191) NOT NULL DEFAULT '0',
    `paidLeaveQuota` INTEGER NOT NULL DEFAULT 12,
    `medicalLeaveQuota` INTEGER NOT NULL DEFAULT 12,
    `currentStatus` ENUM('working', 'in_meeting', 'on_break', 'on_leave', 'offline') NOT NULL DEFAULT 'offline',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `checkInAt` DATETIME(3) NULL,
    `checkOutAt` DATETIME(3) NULL,
    `workedMinutes` INTEGER NULL,
    `breakStartAt` DATETIME(3) NULL,
    `totalBreakMinutes` INTEGER NOT NULL DEFAULT 0,
    `scheduledStartTime` VARCHAR(191) NULL,
    `scheduledEndTime` VARCHAR(191) NULL,
    `requiredMinutes` INTEGER NULL,
    `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    `earlyCheckoutMinutes` INTEGER NOT NULL DEFAULT 0,
    `overtimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('present', 'late', 'early_checkout', 'late_and_early_checkout', 'half_day', 'currently_working', 'not_checked_out', 'absent', 'on_leave', 'weekend', 'holiday', 'holiday_worked', 'week_off_worked') NOT NULL DEFAULT 'currently_working',
    `lastEditedBy` VARCHAR(191) NULL,
    `lastEditedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attendance_records_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_breaks` (
    `id` VARCHAR(191) NOT NULL,
    `attendanceRecordId` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_breaks_attendanceRecordId_idx`(`attendanceRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `attendanceRecordId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `field` VARCHAR(50) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_audit_logs_attendanceRecordId_idx`(`attendanceRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `workStartTime` VARCHAR(5) NOT NULL DEFAULT '09:30',
    `workEndTime` VARCHAR(5) NOT NULL DEFAULT '18:30',
    `requiredMinutesPerDay` INTEGER NOT NULL DEFAULT 480,
    `lateGraceMinutes` INTEGER NOT NULL DEFAULT 15,
    `earlyCheckoutGraceMinutes` INTEGER NOT NULL DEFAULT 0,
    `workingDays` JSON NOT NULL,
    `weeklyOffDays` JSON NOT NULL,
    `secondSaturdayOff` BOOLEAN NOT NULL DEFAULT false,
    `breakDurationMinutes` INTEGER NOT NULL DEFAULT 60,
    `halfDayThresholdMinutes` INTEGER NOT NULL DEFAULT 240,
    `overtimeThresholdMinutes` INTEGER NOT NULL DEFAULT 0,
    `flexibleWorkingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('public_holiday', 'company_holiday', 'optional_holiday', 'restricted_holiday') NOT NULL DEFAULT 'public_holiday',
    `description` TEXT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT true,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `isTentative` BOOLEAN NOT NULL DEFAULT false,
    `applicableDepartments` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('paid', 'medical', 'unpaid') NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `startDate` VARCHAR(191) NOT NULL,
    `endDate` VARCHAR(191) NOT NULL,
    `days` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,
    `isSystemGenerated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `tasksCompleted` TEXT NOT NULL,
    `blockers` TEXT NULL,
    `totalHoursWorked` VARCHAR(191) NULL,
    `meetingSummary` TEXT NULL,
    `status` ENUM('draft', 'submitted', 'reviewed', 'returned') NOT NULL DEFAULT 'draft',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewComment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `work_logs_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_resources` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `categoryGroup` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `tags` JSON NULL,
    `type` ENUM('document', 'file', 'link') NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `content` LONGTEXT NULL,
    `externalUrl` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `fileMimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `fileData` LONGBLOB NULL,
    `visibility` ENUM('all', 'restricted') NOT NULL DEFAULT 'all',
    `allowedDepartments` JSON NULL,
    `allowedRoles` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(150) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `logoMimeType` VARCHAR(191) NULL,
    `logoData` LONGBLOB NULL,
    `website` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `niche` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `companyDescription` TEXT NULL,
    `aboutText` TEXT NULL,
    `status` ENUM('active', 'onboarding', 'paused', 'completed', 'archived') NOT NULL DEFAULT 'onboarding',
    `dateOnboarded` VARCHAR(191) NULL,
    `contractStartDate` VARCHAR(191) NULL,
    `contractEndDate` VARCHAR(191) NULL,
    `accountManagerId` VARCHAR(191) NULL,
    `mission` TEXT NULL,
    `vision` TEXT NULL,
    `coreValues` TEXT NULL,
    `targetAudiencePrimary` TEXT NULL,
    `targetAudienceSecondary` TEXT NULL,
    `targetAudienceAgeGroup` VARCHAR(191) NULL,
    `targetAudienceLocation` VARCHAR(191) NULL,
    `targetAudienceInterests` TEXT NULL,
    `targetAudiencePainPoints` TEXT NULL,
    `targetAudienceBuyingBehavior` TEXT NULL,
    `businessModel` TEXT NULL,
    `productsServices` TEXT NULL,
    `keyDifferentiators` TEXT NULL,
    `founded` VARCHAR(191) NULL,
    `companySize` VARCHAR(191) NULL,
    `locations` TEXT NULL,
    `brandName` VARCHAR(191) NULL,
    `tagline` VARCHAR(191) NULL,
    `brandDescription` TEXT NULL,
    `brandPersonality` TEXT NULL,
    `brandVoice` TEXT NULL,
    `toneOfVoice` TEXT NULL,
    `communicationStyle` TEXT NULL,
    `primaryColors` JSON NULL,
    `secondaryColors` JSON NULL,
    `accentColors` JSON NULL,
    `headingFont` VARCHAR(191) NULL,
    `bodyFont` VARCHAR(191) NULL,
    `logoUsageRules` TEXT NULL,
    `preferredCommunicationMethod` VARCHAR(191) NULL,
    `preferredMeetingTime` VARCHAR(191) NULL,
    `preferredContentStyle` TEXT NULL,
    `preferredColors` TEXT NULL,
    `thingsToAvoid` TEXT NULL,
    `approvalProcess` TEXT NULL,
    `reportingPreferences` TEXT NULL,
    `specialRequirements` TEXT NULL,
    `retainerValue` VARCHAR(191) NULL,
    `retainerPackage` VARCHAR(191) NULL,
    `renewalDate` VARCHAR(191) NULL,
    `retainerNotes` TEXT NULL,
    `currentPriority` LONGTEXT NULL,
    `currentStrategy` LONGTEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `designation` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `preferredContactMethod` VARCHAR(191) NULL,
    `isDecisionMaker` BOOLEAN NOT NULL DEFAULT false,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_team_members` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `responsibility` TEXT NULL,
    `assignedDate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `client_team_members_clientId_userId_key`(`clientId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_services` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `startDate` VARCHAR(191) NULL,
    `status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
    `assignedUserIds` JSON NULL,
    `deliverables` JSON NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_goals` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `target` DOUBLE NOT NULL,
    `current` DOUBLE NOT NULL DEFAULT 0,
    `startDate` VARCHAR(191) NULL,
    `endDate` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `status` ENUM('active', 'achieved', 'missed') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_assets` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `folder` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `tags` JSON NULL,
    `kind` ENUM('file', 'link') NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileMimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `fileData` LONGBLOB NULL,
    `externalUrl` VARCHAR(191) NULL,
    `version` VARCHAR(191) NULL,
    `isRestricted` BOOLEAN NOT NULL DEFAULT false,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_documents` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` ENUM('contract', 'agreement', 'proposal', 'invoice', 'report', 'strategy', 'meeting', 'other') NOT NULL DEFAULT 'other',
    `fileName` VARCHAR(191) NULL,
    `fileMimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `fileData` LONGBLOB NULL,
    `version` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isConfidential` BOOLEAN NOT NULL DEFAULT false,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_links` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_notes` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `category` ENUM('general', 'strategy', 'preference', 'important', 'meeting', 'warning', 'internal', 'other') NOT NULL DEFAULT 'general',
    `content` TEXT NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_meetings` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `time` VARCHAR(191) NULL,
    `participantUserIds` JSON NULL,
    `meetingLink` VARCHAR(191) NULL,
    `agenda` TEXT NULL,
    `notes` TEXT NULL,
    `decisions` TEXT NULL,
    `actionItems` TEXT NULL,
    `followUpDate` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_activities` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `description` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_compensations` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `monthlySalary` VARCHAR(191) NOT NULL,
    `standardWorkingHoursPerDay` DOUBLE NOT NULL,
    `payrollStatus` ENUM('active', 'excluded', 'on_hold') NOT NULL DEFAULT 'active',
    `effectiveFrom` VARCHAR(191) NOT NULL,
    `effectiveTo` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_compensations_userId_effectiveFrom_idx`(`userId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_payroll_rules` (
    `leaveType` ENUM('paid', 'medical', 'unpaid') NOT NULL,
    `isPayable` BOOLEAN NOT NULL DEFAULT true,
    `payableFraction` VARCHAR(191) NOT NULL DEFAULT '1',
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`leaveType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `payrollRecordId` VARCHAR(191) NOT NULL,
    `type` ENUM('bonus', 'incentive', 'deduction', 'reimbursement', 'advance_recovery', 'other') NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `addedBy` VARCHAR(191) NOT NULL,
    `approvalStatus` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    `isEmployeeVisible` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payroll_adjustments_payrollRecordId_idx`(`payrollRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `payrollMonth` VARCHAR(7) NOT NULL,
    `calendarDays` INTEGER NOT NULL,
    `weeklyOffDays` INTEGER NOT NULL,
    `holidayDays` INTEGER NOT NULL,
    `workingDays` INTEGER NOT NULL,
    `standardHoursPerDay` DOUBLE NOT NULL,
    `scheduledMinutes` INTEGER NOT NULL,
    `actualWorkedMinutes` INTEGER NOT NULL,
    `payableMinutes` INTEGER NOT NULL,
    `extraMinutes` INTEGER NOT NULL,
    `paidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `medicalLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `unpaidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `monthlySalaryUsed` VARCHAR(191) NOT NULL,
    `internalHourlyRate` VARCHAR(191) NOT NULL,
    `baseSalaryEarned` VARCHAR(191) NOT NULL,
    `additionsTotal` VARCHAR(191) NOT NULL DEFAULT '0.00',
    `deductionsTotal` VARCHAR(191) NOT NULL DEFAULT '0.00',
    `finalPayableAmount` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'calculated', 'under_review', 'approved', 'finalized') NOT NULL DEFAULT 'calculated',
    `paymentStatus` ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    `exceptions` JSON NULL,
    `calculatedBy` VARCHAR(191) NOT NULL,
    `calculatedAt` DATETIME(3) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `finalizedBy` VARCHAR(191) NULL,
    `finalizedAt` DATETIME(3) NULL,
    `paidBy` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payroll_records_userId_payrollMonth_key`(`userId`, `payrollMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `payrollRecordId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` ENUM('calculated', 'recalculated', 'salary_changed', 'adjustment_added', 'adjustment_removed', 'under_review', 'approved', 'finalized', 'marked_paid', 'reopened') NOT NULL,
    `field` VARCHAR(191) NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `reason` TEXT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payroll_audit_logs_payrollRecordId_idx`(`payrollRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `payslipEnabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `leadName` VARCHAR(150) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `leadSourceId` VARCHAR(191) NULL,
    `setterId` VARCHAR(191) NULL,
    `closerId` VARCHAR(191) NULL,
    `status` ENUM('new', 'proposal', 'deposit', 'follow_up_ongoing', 'meeting_follow_up', 'won', 'lost') NOT NULL DEFAULT 'new',
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `firstContactAt` DATETIME(3) NULL,
    `meetingBookedAt` DATETIME(3) NULL,
    `meetingDate` VARCHAR(191) NULL,
    `meetingTime` VARCHAR(191) NULL,
    `lastTouchAt` DATETIME(3) NULL,
    `nextFollowUpDate` VARCHAR(191) NULL,
    `wonAt` DATETIME(3) NULL,
    `lostAt` DATETIME(3) NULL,
    `depositPaidAt` VARCHAR(191) NULL,
    `paidInFullAt` VARCHAR(191) NULL,
    `meetingStatus` ENUM('show', 'no_show', 'rescheduled_by_us', 'rescheduled_by_them', 'cancel', 'dq') NULL,
    `meetingLink` VARCHAR(191) NULL,
    `meetingNotes` TEXT NULL,
    `rescheduledDate` VARCHAR(191) NULL,
    `cancellationReason` TEXT NULL,
    `dqReason` TEXT NULL,
    `offerMade` BOOLEAN NULL,
    `saleType` ENUM('one_call', 'follow_up') NULL,
    `lossReason` ENUM('price', 'timing', 'partner_spouse', 'competitor', 'ghosted', 'not_qualified') NULL,
    `lossNotes` TEXT NULL,
    `depositAmount` VARCHAR(191) NOT NULL DEFAULT '0.00',
    `dealValue` VARCHAR(191) NULL,
    `cashCollected` VARCHAR(191) NOT NULL DEFAULT '0.00',
    `refundAmount` VARCHAR(191) NOT NULL DEFAULT '0.00',
    `commissionOverridePercent` VARCHAR(191) NULL,
    `followUpNotes` TEXT NULL,
    `followUpCount` INTEGER NOT NULL DEFAULT 0,
    `clientId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `leads_email_idx`(`email`),
    INDEX `leads_setterId_idx`(`setterId`),
    INDEX `leads_closerId_idx`(`closerId`),
    INDEX `leads_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_activities` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `type` ENUM('call', 'whatsapp', 'email', 'instagram_dm', 'meeting', 'follow_up', 'proposal_sent', 'payment_request', 'status_change', 'field_change', 'note', 'other') NOT NULL,
    `description` TEXT NOT NULL,
    `previousValue` TEXT NULL,
    `newValue` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_activities_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_sources` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lead_sources_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_sales_activities` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `dials` INTEGER NOT NULL DEFAULT 0,
    `dmsSent` INTEGER NOT NULL DEFAULT 0,
    `conversations` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_sales_activities_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_rules` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('default', 'role', 'employee') NOT NULL,
    `salesRole` ENUM('setter', 'closer') NULL,
    `userId` VARCHAR(191) NULL,
    `percent` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_goals` (
    `id` VARCHAR(191) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `revenueGoalAmount` VARCHAR(191) NOT NULL,
    `setBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_goals_period_key`(`period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_team_members` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `salesRole` ENUM('setter', 'closer', 'sales_manager') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `addedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_team_members_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
