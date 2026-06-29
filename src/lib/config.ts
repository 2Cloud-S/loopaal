function yes(value: string | undefined, fallback = false) {
  return value === undefined ? fallback : value.toLowerCase() === "true";
}

function aiProvider() {
  const configured = (process.env.AI_PROVIDER || "").toLowerCase();
  if (configured === "gemini" || configured === "openai" || configured === "demo") return configured;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}

export const config = {
  store: process.env.LOOPAAL_STORE || "demo",
  tableName: process.env.LOOPAAL_TABLE_NAME || "loopaal-h0",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  },
  ai: {
    provider: aiProvider(),
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    geminiProject: process.env.GEMINI_PROJECT || ""
  },
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || ""
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  },
  google: {
    token: "",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
    refreshToken: "",
    sheetId: "",
    driveFolderId: "",
    sender: ""
  },
  whatsapp: {
    token: "",
    phoneNumberId: "",
    verifyToken: ""
  },
  website: {
    url: "",
    secret: ""
  },
  outbound: {
    live: yes(process.env.OUTBOUND_SENDS_LIVE)
  },
  approvals: {
    research: yes(process.env.AUTO_APPROVE_RESEARCH, true),
    drafts: yes(process.env.AUTO_APPROVE_DRAFTS),
    send: yes(process.env.AUTO_APPROVE_SEND),
    website: yes(process.env.AUTO_APPROVE_WEBSITE)
  }
};

export function useDynamoDb() {
  return config.store === "dynamodb" && Boolean(config.tableName && config.aws.region && config.aws.accessKeyId && config.aws.secretAccessKey);
}

export function useSupabaseAuth() {
  return Boolean(config.supabase.url && config.supabase.anonKey);
}

export function integrationStatus() {
  const googleOAuthReady = Boolean(config.google.clientId && config.google.clientSecret);
  return {
    store: useDynamoDb() ? "dynamodb" : "demo",
    auth: useSupabaseAuth() ? "supabase" : "demo",
    supabase: useSupabaseAuth(),
    dynamodb: useDynamoDb(),
    aiProvider: config.ai.provider,
    gemini: Boolean(config.ai.geminiApiKey && config.ai.geminiModel),
    openai: Boolean(config.openai.apiKey && config.openai.model),
    googleOAuthReady,
    googleRefresh: false,
    sheets: false,
    drive: false,
    gmailReady: googleOAuthReady,
    gmail: false,
    whatsappReady: false,
    whatsapp: false,
    websiteReady: false,
    website: false,
    outboundLive: config.outbound.live
  };
}
