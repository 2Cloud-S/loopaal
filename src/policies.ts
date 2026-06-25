import { config } from "./config.ts";
import type { ApprovalKind } from "./types.ts";

export function needsApproval(kind: ApprovalKind) {
  if (kind === "website") return !config.approvals.website;
  return !config.approvals.send;
}

export function canExecute(status: string, scheduledFor?: string) {
  if (status !== "approved") return false;
  return !scheduledFor || new Date(scheduledFor).getTime() <= Date.now();
}

export function outboundRisk(text: string) {
  const flags: string[] = [];
  if (/guarantee|risk[- ]free|100%|best in the world/i.test(text)) flags.push("unverifiable claim");
  if (/password|credit card|bank account|seed phrase/i.test(text)) flags.push("sensitive-data request");
  if (text.length > 1800) flags.push("message is too long");
  return flags;
}
