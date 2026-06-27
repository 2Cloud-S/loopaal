export type Channel = "gmail" | "whatsapp";
export type ApprovalKind = "email" | "whatsapp" | "website";
export type WorkerStatus = "queued" | "running" | "complete" | "failed";

export interface CampaignCriteria {
  businessNames: string[];
  industries: string[];
  countries: string[];
  decisionMakers: string[];
  offer: string;
  notes: string;
}

export interface Campaign {
  id: string;
  workspaceId?: string;
  name: string;
  status: "draft" | "running" | "paused" | "complete";
  criteria: CampaignCriteria;
  createdAt: string;
}

export interface Prospect {
  id: string;
  workspaceId?: string;
  campaignId: string;
  businessName: string;
  website?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  facts: string[];
  sources: string[];
  confidence: number;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  workspaceId?: string;
  scope: "business" | "campaign" | "prospect" | "conversation";
  scopeId: string;
  text: string;
  tags: string[];
  createdAt: string;
}

export interface Approval {
  id: string;
  workspaceId?: string;
  kind: ApprovalKind;
  status: "pending" | "approved" | "rejected" | "executed" | "failed" | "previewed" | "draft_created" | "sent";
  title: string;
  payload: Record<string, unknown>;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerJob {
  id: string;
  workspaceId?: string;
  campaignId: string;
  workerId: string;
  status: WorkerStatus;
  summary: string;
  artifacts: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId?: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface AppState {
  campaigns: Campaign[];
  prospects: Prospect[];
  memories: MemoryItem[];
  approvals: Approval[];
  workerJobs: WorkerJob[];
  audit: AuditEvent[];
  connections: Connection[];
  identity?: WorkspaceIdentity;
}

export interface WorkspaceIdentity {
  workspaceId: string;
  businessName: string;
  senderName?: string;
  replyTo?: string;
  defaultTone?: string;
  websiteUrl?: string;
  defaultSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionIdentity {
  displayName?: string;
  email?: string;
  replyTo?: string;
  signature?: string;
  businessName?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  domain?: string;
  destinationLabel?: string;
  webhookUrl?: string;
  verifyToken?: string;
  sendAsEmail?: string;
  providerAccountId?: string;
}

export interface Connection {
  id: string;
  workspaceId: string;
  provider: "google" | "whatsapp" | "website";
  status: "connected" | "needs_setup";
  scopes: string[];
  label: string;
  identity?: ConnectionIdentity;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
