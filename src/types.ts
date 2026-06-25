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
  name: string;
  status: "draft" | "running" | "paused" | "complete";
  criteria: CampaignCriteria;
  createdAt: string;
}

export interface Prospect {
  id: string;
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
  scope: "business" | "campaign" | "prospect" | "conversation";
  scopeId: string;
  text: string;
  tags: string[];
  createdAt: string;
}

export interface Approval {
  id: string;
  kind: ApprovalKind;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  title: string;
  payload: Record<string, unknown>;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerJob {
  id: string;
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
}
