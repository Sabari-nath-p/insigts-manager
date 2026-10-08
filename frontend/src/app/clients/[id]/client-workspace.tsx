'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type {
  Client,
  ClientContact,
  ClientTeamMember,
  ClientServiceItem,
  ClientGoal,
  ClientAsset,
  ClientDocument,
  ClientLink,
  ClientNote,
  ClientMeeting,
  ClientActivity,
} from '../types';
import { OverviewTab } from './tabs/overview-tab';
import { AboutTab } from './tabs/about-tab';
import { BrandTab } from './tabs/brand-tab';
import { ServicesTab } from './tabs/services-tab';
import { TeamTab } from './tabs/team-tab';
import { RetainerTab } from './tabs/retainer-tab';
import { ContactsTab } from './tabs/contacts-tab';
import { AssetsTab } from './tabs/assets-tab';
import { DocumentsTab } from './tabs/documents-tab';
import { LinksTab } from './tabs/links-tab';
import { NotesTab } from './tabs/notes-tab';
import { MeetingsTab } from './tabs/meetings-tab';
import { GoalsTab } from './tabs/goals-tab';
import { ActivityTab } from './tabs/activity-tab';
import { SettingsTab } from './tabs/settings-tab';
import { PlaceholderTab } from './tabs/placeholder-tab';

const STATUS_TONE: Record<string, BadgeKey> = {
  active: 'badgeGreen',
  onboarding: 'badgeBlue',
  paused: 'badgeYellow',
  completed: 'badgeGray',
  archived: 'badgeRed',
};

export interface Employee {
  id: string;
  fullName: string;
  role: string;
}

export function ClientWorkspace({
  client,
  contacts,
  team,
  services,
  goals,
  assets,
  documents,
  links,
  notes,
  meetings,
  activity,
  employees,
  currentUserId,
  canManage,
}: {
  client: Client;
  contacts: ClientContact[];
  team: ClientTeamMember[];
  services: ClientServiceItem[];
  goals: ClientGoal[];
  assets: ClientAsset[];
  documents: ClientDocument[];
  links: ClientLink[];
  notes: ClientNote[];
  meetings: ClientMeeting[];
  activity: ClientActivity[];
  employees: Employee[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [tab, setTab] = useState('overview');
  const shared = { clientId: client.id, currentUserId, canManage, employees };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-tint text-primary-dark">
          {client.status ? <Building2 size={24} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] tracking-tight text-text">{client.clientName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Pill tone={STATUS_TONE[client.status] ?? 'badgeGray'}>{client.status}</Pill>
            {client.industry && <span>Industry: {client.industry}</span>}
            <span>Account manager: {client.accountManagerName ?? 'Unassigned'}</span>
            {client.dateOnboarded && <span>Onboarded: {new Date(client.dateOnboarded).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="timetracking">Time Tracking</TabsTrigger>
          <TabsTrigger value="retainer">Retainer</TabsTrigger>
          <TabsTrigger value="shoots">Shoots</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="goals">Goals &amp; KPIs</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {canManage && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab client={client} services={services} team={team} activity={activity} goals={goals} onNavigateTab={setTab} />
        </TabsContent>
        <TabsContent value="about">
          <AboutTab client={client} {...shared} />
        </TabsContent>
        <TabsContent value="brand">
          <BrandTab client={client} {...shared} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab services={services} {...shared} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab team={team} {...shared} />
        </TabsContent>
        <TabsContent value="projects">
          <PlaceholderTab name="Projects" />
        </TabsContent>
        <TabsContent value="tasks">
          <PlaceholderTab name="Tasks" />
        </TabsContent>
        <TabsContent value="content">
          <PlaceholderTab name="Content Calendar" />
        </TabsContent>
        <TabsContent value="approvals">
          <PlaceholderTab name="Creative Approvals" />
        </TabsContent>
        <TabsContent value="assets">
          <AssetsTab assets={assets} {...shared} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab contacts={contacts} {...shared} />
        </TabsContent>
        <TabsContent value="meetings">
          <MeetingsTab meetings={meetings} {...shared} />
        </TabsContent>
        <TabsContent value="timetracking">
          <PlaceholderTab name="Time Tracking" />
        </TabsContent>
        <TabsContent value="retainer">
          <RetainerTab client={client} services={services} canManage={canManage} />
        </TabsContent>
        <TabsContent value="shoots">
          <PlaceholderTab name="Shoot Schedule" />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab documents={documents} {...shared} />
        </TabsContent>
        <TabsContent value="links">
          <LinksTab links={links} {...shared} />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab goals={goals} {...shared} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab notes={notes} {...shared} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab activity={activity} />
        </TabsContent>
        {canManage && (
          <TabsContent value="settings">
            <SettingsTab client={client} employees={employees} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
