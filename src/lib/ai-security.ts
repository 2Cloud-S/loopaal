import { createHmac, randomBytes } from "node:crypto";
import { config } from "./config.ts";
import type { AppState, Connection } from "../types.ts";

export const LOOPAAL_AI_TRIAL_LIMIT = 5;

export function aiConnection(state: AppState) {
  return state.connections.find(connection => connection.provider === "ai" && connection.status === "connected");
}

export function aiTrialStatus(state: AppState) {
  const used = state.campaigns.length;
  const connected = Boolean(aiConnection(state));
  return {
    limit: LOOPAAL_AI_TRIAL_LIMIT,
    used,
    remaining: Math.max(0, LOOPAAL_AI_TRIAL_LIMIT - used),
    exhausted: used >= LOOPAAL_AI_TRIAL_LIMIT,
    customerAiConnected: connected,
    provider: aiConnection(state)?.identity?.aiProvider || "",
    model: aiConnection(state)?.identity?.model || config.ai.geminiModel || config.openai.model,
    loopaalTrialAvailable: used < LOOPAAL_AI_TRIAL_LIMIT,
    requiresCustomerAi: used >= LOOPAAL_AI_TRIAL_LIMIT && !connected
  };
}

export function assertAiAvailableForNewCampaign(state: AppState) {
  const status = aiTrialStatus(state);
  if (status.requiresCustomerAi) {
    throw Object.assign(new Error("Loopaal trial AI limit reached. Connect a customer-owned AI provider with OAuth before creating more AI campaigns."), { status: 402 });
  }
}

export function signedAiState(workspaceId: string, provider: string) {
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ workspaceId, provider, nonce, iat: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", config.google.clientSecret || config.supabase.anonKey || "loopaal-dev-state").update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySignedAiState(value: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", config.google.clientSecret || config.supabase.anonKey || "loopaal-dev-state").update(payload).digest("hex");
  if (signature !== expected) throw new Error("Invalid OAuth state signature");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { workspaceId?: string; provider?: string; iat?: number };
  if (!parsed.workspaceId || !parsed.provider) throw new Error("Invalid OAuth state payload");
  if (parsed.iat && Date.now() - parsed.iat > 10 * 60 * 1000) throw new Error("OAuth state expired");
  return parsed;
}

export function safeAiMetadataConnection(input: { workspaceId: string; provider: string; model?: string; tokenRef?: string; accountLabel?: string }): Connection {
  const now = new Date().toISOString();
  return {
    id: `con_ai_${input.provider}`,
    workspaceId: input.workspaceId,
    provider: "ai",
    status: "connected",
    scopes: ["ai.oauth"],
    label: input.accountLabel || `${input.provider} AI`,
    identity: {
      aiProvider: input.provider,
      model: input.model || "",
      tokenRef: input.tokenRef || "",
      destinationLabel: "OAuth token stored outside Loopaal app database"
    },
    createdAt: now,
    updatedAt: now
  };
}
