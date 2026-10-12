# 2-minute video script

**0:00 - The problem (20s)**
"SaaSquatch is built for people who buy small businesses. But when I looked at it, I saw a gap: you decide who to spend credits on before you know who's actually worth it, and the AI score doesn't tell you why. I built BuyBox Scorer to fix that."

**0:20 - Demo (60s)**
- Load sample data. "30 rows in, and it merged 6 duplicates automatically."
- Fill the buy box. "I'm looking for HVAC, plumbing and electrical businesses in Ohio and Pennsylvania, 10-30 employees, 25+ years old."
- Check websites. "It reads each company's public about page, respecting robots.txt, and looks for founding year, a named founder, and whether a successor is mentioned."
- Rank. "Every company gets a score and a reason I can read. Maple Ridge HVAC: founded 1989, founder named, no successor mentioned. That's the kind of owner who may be thinking about an exit."
- Open "Why?" on one lead, then draft outreach, then download the CSV.
- "The summary says enriching only the top leads skips 58% of the list. That's credits saved."

**1:20 - Decisions (30s)**
"I used transparent weighted rules instead of a black-box model, so a buyer can trust and tune it. The crawler is ethical: robots.txt, rate limits, caching, public pages only. It's React and TypeScript on the front end, Node and Express on the back end, with 22 unit tests on the core logic."

**1:50 - Close (10s)**
"Next step is Postgres and a background job queue to take it from demo to production. Thanks for watching."
