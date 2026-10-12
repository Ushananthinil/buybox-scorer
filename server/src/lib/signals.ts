import { Signals } from "./types.js";

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const FOUNDED = /(?:since|founded(?:\s+in)?|established(?:\s+in)?|est\.?)\s*(?:in\s+)?(18\d{2}|19\d{2}|20[0-2]\d)/i;
const FAMILY = /family[\s-](?:owned|operated|run)/i;
const SUCCESSOR =
  /(?:second|third|next)[\s-]generation|(?:son|daughter)\s+(?:now\s+)?(?:runs|joined|leads|took over)|succession|successor/i;
const FOUNDER_WORDS = /\b(?:founder|founded by|owner|owned by|owner-operator)\b/i;
const OWNER_NAME =
  /(?:[Ff]ounded by|[Oo]wned and operated by|[Oo]wned by|[Ff]ounder:?|[Oo]wner:?)\s+([A-Z][a-z]+(?:\s[A-Z]\.)?\s[A-Z][a-z]+)/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const HIRING = /we['’]re hiring|join our team|open positions|careers/i;

export function extractSignals(text: string, currentYear = new Date().getFullYear()): Signals {
  const founded = text.match(FOUNDED);
  const foundedYear = founded ? Number(founded[1]) : undefined;
  const emails = (text.match(EMAIL) ?? []).filter((e) => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e));

  return {
    foundedYear,
    yearsInBusiness: foundedYear ? Math.max(0, currentYear - foundedYear) : undefined,
    familyOwned: FAMILY.test(text),
    founderLed: FOUNDER_WORDS.test(text),
    ownerName: text.match(OWNER_NAME)?.[1],
    email: emails[0],
    successorMention: SUCCESSOR.test(text),
    hiring: HIRING.test(text),
  };
}
