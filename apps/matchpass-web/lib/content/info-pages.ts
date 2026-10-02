/**
 * Static help and policy content. Legal pages (terms, privacy, refund policy) are written as
 * plain-language drafts and must be reviewed by counsel before launch.
 */
export type InfoSection = { id: string; title: string; paragraphs: string[] };
export type InfoPageContent = { eyebrow: string; title: string; intro: string; updated?: string; sections: InfoSection[] };

const UPDATED = "1 October 2026";

export const INFO_PAGES: Record<string, InfoPageContent> = {
  help: {
    eyebrow: "Help",
    title: "Help centre",
    intro: "Everything about buying, using and passing on your Matchpass tickets.",
    sections: [
      {
        id: "buying",
        title: "Buying tickets",
        paragraphs: [
          "Choose an event, pick your tickets and pay within 10 minutes — your seats are held for you while you check out.",
          "You can pay by card on our payment provider’s secure page, with a mobile wallet, with InstaPay or at any Fawry outlet. Fawry bills keep your tickets for 48 hours.",
          "For high-demand matches you may join a waiting room before sales open. Everyone inside at opening time gets a random place in line, so arriving early doesn’t matter.",
        ],
      },
      {
        id: "fan-id",
        title: "Fan ID",
        paragraphs: [
          "Football matches need an approved Fan ID for every ticket holder, and each Fan ID can hold one ticket per match.",
          "Getting a Fan ID takes about two minutes: photograph your national ID or passport, take a selfie and confirm your details. Most checks finish within minutes.",
          "Once approved you can link up to three family members or friends who have their own Fan ID and buy tickets for them.",
        ],
      },
      {
        id: "entry",
        title: "Getting in",
        paragraphs: [
          "Your QR code appears in My tickets 24 hours before kick-off or doors open (straight away for cinema). It changes every 30 seconds, so screenshots won’t scan.",
          "At football matches, gate staff check your face against your Fan ID — bring your ID card.",
        ],
      },
      {
        id: "transfers",
        title: "Transfers and resale",
        paragraphs: [
          "Send a ticket to a friend from the ticket page. Match tickets can only go to an approved Fan ID; other tickets go to a phone number or email. Your friend has 24 hours to accept, and you can cancel until they do.",
          "Can’t go? Sell on official resale at up to face value. When it sells, the buyer gets a brand-new ticket and you receive the price minus a 5% fee within 2 working days.",
        ],
      },
      {
        id: "refunds",
        title: "Refunds",
        paragraphs: [
          "If an event is cancelled we refund every ticket automatically, fees included — you don’t need to do anything.",
          "Otherwise refunds depend on the event type. See the refund policy for details, and request one from the ticket in My tickets.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of sale",
    intro: "These terms apply whenever you buy, transfer or resell a ticket on Matchpass.",
    updated: UPDATED,
    sections: [
      {
        id: "agent",
        title: "Who you buy from",
        paragraphs: [
          "Matchpass sells tickets as an agent on behalf of event organisers (clubs, promoters and cinemas). Your contract for the event itself is with the organiser.",
        ],
      },
      {
        id: "prices",
        title: "Prices and fees",
        paragraphs: [
          "Prices are in Egyptian pounds and include VAT. A per-ticket service fee is shown before you pay and is part of the total.",
          "Your order is confirmed only once payment is received. Unpaid orders are released when the hold or the Fawry bill expires.",
        ],
      },
      {
        id: "tickets",
        title: "Your tickets",
        paragraphs: [
          "Each ticket is tied to its holder — a Fan ID for football matches, or a Matchpass account for other events. Organisers may refuse entry to anyone who isn’t the holder.",
          "Tickets may only be passed on through Matchpass transfers or official resale. Reselling above face value, or anywhere else, is not allowed and the ticket may be cancelled without a refund.",
        ],
      },
      {
        id: "changes",
        title: "Cancelled or changed events",
        paragraphs: [
          "If an event is cancelled you receive a full refund including fees. If it is postponed or moved, you can keep your ticket for the new date or request a full refund within 7 days of the announcement.",
        ],
      },
      {
        id: "conduct",
        title: "Conduct and entry",
        paragraphs: [
          "Venue rules apply. You may be refused entry or removed for unsafe behaviour, and the organiser may carry out security checks.",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy policy",
    intro: "What we collect, why, and the choices you have.",
    updated: UPDATED,
    sections: [
      {
        id: "collect",
        title: "What we collect",
        paragraphs: [
          "Your name, mobile number, optional email, orders and tickets. For a Fan ID we also process photos of your ID document and a selfie.",
          "Card details are entered on our payment provider’s page and never reach Matchpass.",
        ],
      },
      {
        id: "use",
        title: "How we use it",
        paragraphs: [
          "To sell and deliver tickets, verify Fan IDs for stadium entry, prevent fraud and touting, and send the service messages you need (order confirmations, waiting-room turns, gate changes).",
          "Marketing messages are only sent if you opt in, and you can switch them off at any time in Account & preferences.",
        ],
      },
      {
        id: "identity",
        title: "Identity documents",
        paragraphs: [
          "ID photos and selfies are encrypted in transit and at rest, used only by our verification partner to confirm who you are, and deleted after the check. We keep the verified name and Fan ID number.",
        ],
      },
      {
        id: "sharing",
        title: "Who we share it with",
        paragraphs: [
          "The organiser of an event you attend (to admit you), payment providers (to take payment) and our verification partner (for Fan IDs). We don’t sell your data.",
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        paragraphs: [
          "You can ask for a copy of your data, correct it or delete your account by contacting privacy@matchpass.app. Some records (such as payments) must be kept for legal reasons.",
        ],
      },
    ],
  },
  "refund-policy": {
    eyebrow: "Legal",
    title: "Refund policy",
    intro: "When you can get your money back, and how long it takes.",
    updated: UPDATED,
    sections: [
      {
        id: "cancelled",
        title: "Cancelled and postponed events",
        paragraphs: [
          "Cancelled events are refunded automatically in full, including service fees, to your original payment method.",
          "For postponed or moved events you can keep your ticket or ask for a full refund within 7 days of the announcement.",
        ],
      },
      {
        id: "matches",
        title: "Football matches",
        paragraphs: [
          "Match tickets can’t be refunded for a change of plans. Transfer them to another Fan ID or sell them on official resale at face value.",
        ],
      },
      {
        id: "concerts",
        title: "Concerts and events",
        paragraphs: [
          "The ticket price can be refunded up to 7 days before the event. Service fees are not refundable unless the event is cancelled.",
        ],
      },
      {
        id: "cinema",
        title: "Cinema",
        paragraphs: ["Cinema tickets can be refunded up to 2 hours before the showtime."],
      },
      {
        id: "timing",
        title: "How long it takes",
        paragraphs: [
          "We review requests within 24 hours. Card refunds take 5–10 working days, mobile wallets 1–3 working days, and Matchpass credit is instant (with a 5% bonus).",
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Help",
    title: "Contact us",
    intro: "Our fan support team answers every day from 9:00 to 23:00 Cairo time.",
    sections: [
      {
        id: "fans",
        title: "Fans",
        paragraphs: [
          "Email support@matchpass.app with your order reference (it starts with MP-). We reply within 24 hours, and faster on match days.",
        ],
      },
      {
        id: "organisers",
        title: "Organisers",
        paragraphs: ["Partnerships and ticketing for your club, venue or tour: partners@matchpass.app."],
      },
      { id: "press", title: "Press", paragraphs: ["press@matchpass.app"] },
    ],
  },
  organisers: {
    eyebrow: "Organisers",
    title: "Sell tickets with us",
    intro: "Matchpass powers ticketing for clubs, promoters and cinemas across Egypt.",
    sections: [
      {
        id: "what",
        title: "What you get",
        paragraphs: [
          "Fan ID–verified match sales, waiting rooms for high-demand releases, exact seat maps, official face-value resale and automatic refunds when plans change.",
        ],
      },
      {
        id: "start",
        title: "Getting started",
        paragraphs: ["Email partners@matchpass.app and our team will set up your venue and first event."],
      },
    ],
  },
  "organiser-login": {
    eyebrow: "Organisers",
    title: "Organiser log in",
    intro: "The organiser dashboard is available to verified partners.",
    sections: [
      {
        id: "access",
        title: "Access",
        paragraphs: ["Contact your account manager or partners@matchpass.app to get access for your team."],
      },
    ],
  },
  fees: {
    eyebrow: "Help",
    title: "Fees",
    intro: "No surprises: every fee is shown before you pay.",
    sections: [
      {
        id: "buyers",
        title: "Buying",
        paragraphs: [
          "A per-ticket service fee is added at checkout — 15 EGP for matches, 25 EGP for concerts and events, 10 EGP for cinema.",
        ],
      },
      {
        id: "resale",
        title: "Selling on official resale",
        paragraphs: ["Sellers pay 5% of the sale price. Buyers pay the listed price plus the usual service fee."],
      },
    ],
  },
};
