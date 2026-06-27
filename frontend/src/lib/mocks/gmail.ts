import type { ParsedEmail } from "@/types/gmail";

const senders = [
  { name: "Secure Bank Support", email: "noreply@suspicious-domain.ru", domain: "suspicious-domain.ru" },
  { name: "GitHub", email: "noreply@github.com", domain: "github.com" },
  { name: "Acme Invoicing", email: "billing@acme-invoices.co", domain: "acme-invoices.co" },
  { name: "Stripe", email: "receipts@stripe.com", domain: "stripe.com" },
  { name: "PayPal Security Team", email: "service@paypaI-alert.com", domain: "paypaI-alert.com" },
  { name: "Linear", email: "notifications@linear.app", domain: "linear.app" },
  { name: "Crypto Wallet Alerts", email: "support@wallet-verify.io", domain: "wallet-verify.io" },
  { name: "Vercel", email: "team@vercel.com", domain: "vercel.com" },
  { name: "Notion", email: "team@notion.so", domain: "notion.so" },
  { name: "Apple ID", email: "no-reply@appleid.appIe.com", domain: "appleid.appIe.com" },
  { name: "Figma", email: "updates@figma.com", domain: "figma.com" },
  { name: "Dropbox", email: "no-reply@dropbox.com", domain: "dropbox.com" },
];

const subjects = [
  "URGENT: Your account will be suspended within 24 hours",
  "Your weekly digest is here",
  "Invoice #4821 attached - payment required",
  "Receipt from your recent payment",
  "Unusual sign-in attempt detected — verify now",
  "New issue assigned to you",
  "Wallet recovery: action required immediately",
  "Deployment ready for production",
  "Your shared workspace was updated",
  "Verify your Apple ID before access is revoked",
  "Design review feedback ready",
  "Files shared with you",
];

const snippets = [
  "We've detected suspicious activity on your account. Click below to verify your identity immediately to prevent suspension...",
  "Here's what happened this week across your subscriptions, projects, and saved articles...",
  "Please find the attached invoice for services rendered. Payment is due within 7 days of receipt...",
  "Thank you for your payment of $42.00. Your subscription has been renewed for another month...",
  "Someone signed in to your account from an unrecognized device. If this wasn't you, secure your account now...",
  "@maria assigned ENG-482 to you and added it to the current sprint. Review the description and acceptance criteria...",
  "Your wallet seed phrase requires re-verification due to a recent security event. Submit your phrase to maintain access...",
  "Your latest build passed all checks and is now live on production. View the deployment summary for details...",
  "Three new pages were created in your shared workspace this week. See what your team has been working on...",
  "Your Apple ID will be locked unless you re-confirm your billing details using the secure link below...",
  "Your design has 3 new comments from the review session. Open the file to address feedback before the next sync...",
  "A new folder has been shared with you. View the contents or download for offline access...",
];

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

export const MOCK_EMAILS: ParsedEmail[] = senders.map((s, i) => {
  const subject = subjects[i];
  const snippet = snippets[i];
  return {
    id: `mock_msg_${i + 1}`,
    threadId: `mock_thr_${i + 1}`,
    from: `${s.name} <${s.email}>`,
    fromName: s.name,
    fromEmail: s.email,
    fromDomain: s.domain,
    to: "you@example.com",
    subject,
    date: daysAgo(i * 0.4),
    snippet,
    bodyText: `${snippet}\n\nIf you have questions, contact our support team.\n\nThis is a demo email rendered offline.`,
    bodyHtml: `<div style="font-family:Inter,sans-serif;line-height:1.6;color:#e5e7eb"><p>${snippet}</p><p style="margin-top:16px">If you have questions, contact our support team.</p><p style="margin-top:24px;color:#9ca3af;font-size:12px">This is a demo email rendered offline.</p></div>`,
    headers: {
      From: `${s.name} <${s.email}>`,
      To: "you@example.com",
      Subject: subject,
      Date: new Date(daysAgo(i * 0.4)).toUTCString(),
      "Message-ID": `<mock_msg_${i + 1}@${s.domain}>`,
    },
    attachments: i === 2 ? [{ filename: "invoice_4821.docm", mime: "application/vnd.ms-word.document.macroenabled.12", size: 84212 }] : [],
    labels: i % 3 === 0 ? ["INBOX", "UNREAD"] : ["INBOX"],
    unread: i % 3 === 0,
    hasAttachments: i === 2,
    raw: `From: ${s.name} <${s.email}>\nTo: you@example.com\nSubject: ${subject}\nDate: ${new Date(daysAgo(i * 0.4)).toUTCString()}\n\n${snippet}`,
  };
});
