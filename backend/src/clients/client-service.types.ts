/** Shape of one entry in ClientService.deliverables (a Prisma Json column, not a Prisma model). */
export interface ServiceDeliverable {
  name: string; // e.g. "Reels"
  target: number;
  completed: number;
}
