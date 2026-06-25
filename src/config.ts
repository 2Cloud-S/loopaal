function yes(value: string | undefined, fallback = false) {
  return value === undefined ? fallback : value.toLowerCase() === "true";
}

export const config = {
  port: Number(process.env.PORT || 4100),
  openai: { apiKey: process.env.OPENAI_API_KEY || "", model: process.env.OPENAI_MODEL || "" },
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

export function integrationStatus() {
  return {
    openai: Boolean(config.openai.apiKey && config.openai.model),
    sheets: Boolean(config.google.token && config.google.sheetId),
    drive: Boolean(config.google.token && config.google.driveFolderId),
    gmail: Boolean(config.google.token && config.google.sender),
    whatsapp: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
    website: Boolean(config.website.url && config.website.secret)
  };
}
