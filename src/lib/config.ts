function yes(value: string | undefined, fallback = false) {
  return value === undefined ? fallback : value.toLowerCase() === "true";
}

export const config = {
  store: process.env.LOOPAAL_STORE || "demo",
  tableName: process.env.LOOPAAL_TABLE_NAME || "loopaal-h0",
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
    token: process.env.GOOGLE_ACCESS_TOKEN || "",
    sheetId: process.env.GOOGLE_SHEET_ID || "",
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    sender: process.env.GMAIL_SENDER || ""
  },
  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || ""
  },
  website: {
    url: process.env.WEBSITE_WEBHOOK_URL || "",
    secret: process.env.WEBSITE_WEBHOOK_SECRET || ""
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

export function integrationStatus() {
  return {
    store: useDynamoDb() ? "dynamodb" : "demo",
    dynamodb: useDynamoDb(),
    openai: Boolean(config.openai.apiKey && config.openai.model),
    sheets: Boolean(config.google.token && config.google.sheetId),
    drive: Boolean(config.google.token && config.google.driveFolderId),
    gmail: Boolean(config.google.token && config.google.sender),
    whatsapp: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
    website: Boolean(config.website.url && config.website.secret)
  };
}
