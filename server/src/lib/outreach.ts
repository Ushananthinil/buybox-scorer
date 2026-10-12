import { ScoredLead } from "./types.js";

export function outreachDraft(lead: ScoredLead, senderName = "[Your name]"): { subject: string; body: string } {
  const owner = lead.signals?.ownerName?.split(" ")[0];
  const hello = owner ? `Hi ${owner},` : "Hello,";
  const years = lead.signals?.yearsInBusiness;
  const since = lead.signals?.foundedYear && years
    ? `building ${lead.companyName} for ${years} years`
    : `what you've built at ${lead.companyName}`;
  const place = lead.city ? ` in ${lead.city}` : "";

  return {
    subject: `Quick question about ${lead.companyName}`,
    body: [
      hello,
      "",
      `I'm ${senderName}, and I'm looking to acquire and grow a long-term, owner-friendly business${place}. I came across ${lead.companyName} and was impressed by ${since}.`,
      "",
      "I'm not representing a broker or flipping companies. If you've ever wondered what a future beyond the day-to-day might look like, I'd value a short, confidential conversation. No obligation either way.",
      "",
      "Would a 15-minute call next week work?",
      "",
      `Best,\n${senderName}`,
    ].join("\n"),
  };
}
