export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size: number; data?: string; attachmentId?: string };
  parts?: GmailPayload[];
}

export interface GmailMessageRaw {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId?: string;
  internalDate: string;
  payload: GmailPayload;
  sizeEstimate?: number;
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  fromDomain: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  headers: Record<string, string>;
  attachments: { filename: string; mime: string; size: number }[];
  labels: string[];
  unread: boolean;
  hasAttachments: boolean;
  raw: string; // reconstructed RFC822-ish for analyzer
}
