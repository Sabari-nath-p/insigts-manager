export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'completed' | 'archived';

export interface Client {
  id: string;
  clientName: string;
  companyName: string | null;
  website: string | null;
  industry: string | null;
  niche: string | null;
  location: string | null;
  companyDescription: string | null;
  aboutText: string | null;
  status: ClientStatus;
  dateOnboarded: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  accountManagerId: string | null;
  accountManagerName?: string | null;

  mission: string | null;
  vision: string | null;
  coreValues: string | null;
  targetAudiencePrimary: string | null;
  targetAudienceSecondary: string | null;
  targetAudienceAgeGroup: string | null;
  targetAudienceLocation: string | null;
  targetAudienceInterests: string | null;
  targetAudiencePainPoints: string | null;
  targetAudienceBuyingBehavior: string | null;
  businessModel: string | null;
  productsServices: string | null;
  keyDifferentiators: string | null;
  founded: string | null;
  companySize: string | null;
  locations: string | null;

  brandName: string | null;
  tagline: string | null;
  brandDescription: string | null;
  brandPersonality: string | null;
  brandVoice: string | null;
  toneOfVoice: string | null;
  communicationStyle: string | null;
  primaryColors: string[] | null;
  secondaryColors: string[] | null;
  accentColors: string[] | null;
  headingFont: string | null;
  bodyFont: string | null;
  logoUsageRules: string | null;

  preferredCommunicationMethod: string | null;
  preferredMeetingTime: string | null;
  preferredContentStyle: string | null;
  preferredColors: string | null;
  thingsToAvoid: string | null;
  approvalProcess: string | null;
  reportingPreferences: string | null;
  specialRequirements: string | null;

  retainerValue: string | null;
  retainerPackage: string | null;
  renewalDate: string | null;
  retainerNotes: string | null;

  currentPriority: string | null;
  currentStrategy: string | null;

  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;

  activeServicesCount?: number;
  serviceNames?: string[];
  teamSize?: number;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  preferredContactMethod: string | null;
  isDecisionMaker: boolean;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
}

export interface ClientTeamMember {
  id: string;
  clientId: string;
  userId: string;
  fullName: string;
  role: string;
  responsibility: string | null;
  assignedDate: string | null;
}

export interface ServiceDeliverable {
  name: string;
  target: number;
  completed: number;
}

export interface ClientServiceItem {
  id: string;
  clientId: string;
  name: string;
  startDate: string | null;
  status: 'active' | 'paused' | 'completed';
  assignedUserIds: string[] | null;
  deliverables: ServiceDeliverable[] | null;
  notes: string | null;
}

export interface ClientGoal {
  id: string;
  clientId: string;
  name: string;
  target: number;
  current: number;
  startDate: string | null;
  endDate: string | null;
  ownerId: string | null;
  status: 'active' | 'achieved' | 'missed';
  notes: string | null;
}

export interface ClientAsset {
  id: string;
  clientId: string;
  name: string;
  folder: string;
  description: string | null;
  tags: string[] | null;
  kind: 'file' | 'link';
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  version: string | null;
  isRestricted: boolean;
  uploadedBy: string;
  updatedAt: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  category: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  version: string | null;
  description: string | null;
  isConfidential: boolean;
  uploadedBy: string;
  updatedAt: string;
}

export interface ClientLink {
  id: string;
  clientId: string;
  name: string;
  url: string;
  category: string;
  description: string | null;
}

export interface ClientNote {
  id: string;
  clientId: string;
  category: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientMeeting {
  id: string;
  clientId: string;
  title: string;
  date: string;
  time: string | null;
  participantUserIds: string[] | null;
  meetingLink: string | null;
  agenda: string | null;
  notes: string | null;
  decisions: string | null;
  actionItems: string | null;
  followUpDate: string | null;
  createdBy: string;
}

export interface ClientActivity {
  id: string;
  clientId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  description: string;
  createdAt: string;
}
