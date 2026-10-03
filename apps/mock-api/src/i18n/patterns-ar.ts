import type { Pattern } from "./localize";

const TIME = "(\\d{1,2}:\\d{2})";
const MONEY = "(\\d[\\d,]*(?:\\.\\d+)?)";

/** `·`-joined parts, translated one by one (for captures that may contain several labels). */
const parts = (text: string, tr: (s: string) => string) => text.split(" · ").map(tr).join(" · ");

/**
 * Composed API strings, matched against the whole string (case-insensitive, so the upper-case ticket
 * tags match too). Captured parts are translated recursively with `tr`. Order matters: messages that
 * embed an event title come before the generic "X vs Y" title pattern.
 */
const RAW_PATTERNS: [string, (m: RegExpExecArray, tr: (s: string) => string) => string][] = [
  // Money, seats and tickets
  [`^${MONEY} EGP$`, (m) => `${m[1]} ج.م`],
  [`^paid out ${MONEY}$`, (m) => `تم تحويل ${m[1]}`],
  [`^you receive ${MONEY} EGP$`, (m) => `ستحصل على ${m[1]} ج.م`],
  [`^Row ([A-Z]+)$`, (m) => `الصف ${m[1]}`],
  [`^Rows ([A-Z]–[A-Z])$`, (m) => `الصفوف ${m[1]}`],
  [`^Stalls rows ([A-Z]–[A-Z])$`, (m) => `صفوف الصالة ${m[1]}`],
  [`^Seat (\\d+)$`, (m) => `المقعد ${m[1]}`],
  [`^Ticket (\\d+)$`, (m) => `التذكرة ${m[1]}`],
  [`^Entrance ([A-Z])$`, (m) => `المدخل ${m[1]}`],
  [`^Screen (\\d+)$`, (m) => `الشاشة ${m[1]}`],
  [`^Gate (\\d+)$`, (m) => `البوابة ${m[1]}`],
  [`^trailers (\\d+) min$`, (m) => `إعلانات ${m[1]} دقيقة`],
  [`^(\\d+) × (.+)$`, (m, tr) => `${m[1]} × ${tr(m[2]!)}`],
  [`^(.+) × (\\d+)$`, (m, tr) => `${tr(m[1]!)} × ${m[2]}`],
  [`^Fan ID •••• (\\d{4})$`, (m) => `بطاقة المشجع •••• ${m[1]}`],
  [`^(.+) \\(you\\)$`, (m) => `${m[1]} (أنت)`],
  [
    `^Appears (.+) at ${TIME}, 24 hours before (kick-off|gates open)\\.$`,
    (m, tr) => `يظهر ${tr(m[1]!)} الساعة ${m[2]}، قبل ${m[3] === "kick-off" ? "بداية المباراة" : "فتح البوابات"} بـ 24 ساعة.`,
  ],
  [`^Refundable until (.+)$`, (m, tr) => `قابلة للاسترداد حتى ${tr(m[1]!)}`],
  [
    `^Enter through Gate (\\d+)\\. Gate staff will check your face against your Fan ID\\. Parking P2 is closest\\.$`,
    (m) => `ادخل من البوابة ${m[1]}. سيطابق موظفو البوابة وجهك مع بطاقة المشجع. موقف P2 هو الأقرب.`,
  ],
  [`^doors ${TIME}$`, (m) => `الأبواب ${m[1]}`],
  [`^gates open ${TIME}$`, (m) => `فتح البوابات ${m[1]}`],

  // Orders and payments
  [`^order (MP-[\\w-]+)$`, (m) => `الطلب ${m[1]}`],
  [`^Promo ([A-Z0-9]+)$`, (m) => `الرمز الترويجي ${m[1]}`],
  [`^(\\d+)% off tickets$`, (m) => `خصم ${m[1]}% على التذاكر`],
  [`^Paid by card •••• (\\d{4})$`, (m) => `تم الدفع بالبطاقة •••• ${m[1]}`],
  [`^Original card •••• (\\d{4})$`, (m) => `البطاقة الأصلية •••• ${m[1]}`],
  [`^To card •••• (\\d{4})$`, (m) => `إلى البطاقة •••• ${m[1]}`],
  [`^Mobile wallet (.+)$`, (m) => `محفظة الموبايل ${m[1]}`],
  [
    `^Pay at any Fawry outlet or in the myFawry app before (.+) at ${TIME}\\. Your tickets appear as soon as you pay\\.$`,
    (m, tr) => `ادفع في أي منفذ فوري أو في تطبيق myFawry قبل ${tr(m[1]!)} الساعة ${m[2]}. تظهر تذاكرك فور الدفع.`,
  ],
  [`^P2 West, 5 minutes from Gate (\\d+)$`, (m) => `موقف P2 الغربي، على بُعد 5 دقائق من البوابة ${m[1]}`],

  // Refunds
  [`^reason: (.+)$`, (m, tr) => `السبب: ${tr(m[1]!)}`],
  [
    `^Refunded in full, including ${MONEY} EGP service fees, because the (match|event) was (postponed|cancelled)\\.$`,
    (m) =>
      `تم الاسترداد بالكامل، شاملًا رسوم خدمة ${m[1]} ج.م، لأن ${m[2] === "match" ? "المباراة" : "الفعالية"} ${m[3] === "postponed" ? (m[2] === "match" ? "تأجّلت" : "تأجّلت") : "أُلغيت"}.`,
  ],
  [`^Your (\\d+) tickets were refunded in full, including fees\\.$`, (m) => `تم استرداد قيمة تذاكرك (${m[1]}) بالكامل شاملة الرسوم.`],
  [`^(\\d+) tickets?$`, (m) => `${m[1]} تذاكر`],

  // Notifications
  [`^(.+) has been (postponed|cancelled)\\.?$`, (m, tr) => `${m[2] === "postponed" ? "تأجّلت" : "أُلغيت"} ${tr(m[1]!)}`],
  [`^(.+) sent you a ticket for (.+)\\.$`, (m, tr) => `أرسل لك ${m[1]} تذكرة لـ ${tr(m[2]!)}.`],
  [`^(.+) sent you a ticket$`, (m) => `أرسل لك ${m[1]} تذكرة`],
  [`^(.+) sold for ${MONEY} EGP\\.$`, (m, tr) => `بيعت ${parts(m[1]!, tr)} مقابل ${m[2]} ج.م.`],
  [`^(.+)\\. Accept within 24 hours\\.$`, (m, tr) => `${parts(m[1]!, tr)}. اقبلها خلال 24 ساعة.`],

  // Errors
  [`^(.+) not found$`, (m, tr) => `لم يتم العثور على ${tr(m[1]!)}`],
  [`^No route for (\\w+) (\\S+)$`, () => "هذا المسار غير موجود"],
  [`^This transfer was already (\\w+)$`, (m, tr) => `هذا التحويل ${tr(m[1]!)} بالفعل`],
  [`^This event has been (\\w+) — tickets aren't on sale$`, (m, tr) => `هذه الفعالية ${tr(m[1]!)} — التذاكر غير معروضة للبيع`],
  [`^Up to (\\d+) (seats|tickets) per order$`, (m) => `حتى ${m[1]} ${m[2] === "seats" ? "مقاعد" : "تذاكر"} في الطلب الواحد`],
  [`^You can request a new code in (\\d+) seconds$`, (m) => `يمكنك طلب رمز جديد بعد ${m[1]} ثانية`],
  [`^You've already used (\\S+)$`, (m) => `لقد استخدمت ${m[1]} من قبل`],
  [`^Seat (\\S+) doesn't exist$`, (m) => `المقعد ${m[1]} غير موجود`],
  [`^Seat (\\S+) was just taken — pick another$`, (m) => `حُجز المقعد ${m[1]} للتو — اختر غيره`],
  [`^Only (\\d+) (.+) tickets left$`, (m, tr) => `تبقّى ${m[1]} تذاكر فقط من ${tr(m[2]!)}`],
  [`^(.+) is sold out for (\\d+) seats together$`, (m, tr) => `لا تتوفر ${m[2]} مقاعد متجاورة في ${tr(m[1]!)}`],
  [`^The maximum price is (.+) — the face value$`, (m, tr) => `الحد الأقصى للسعر ${tr(m[1]!)} — السعر الأصلي`],
  [
    `^(.+) already has a ticket for this match — one ticket per Fan ID$`,
    (m) => `لدى ${m[1]} تذكرة لهذه المباراة بالفعل — تذكرة واحدة لكل بطاقة مشجع`,
  ],
  [`^This bill is (\\w+)$`, (m, tr) => `هذه الفاتورة ${tr(m[1]!)}`],
  [`^Invalid (.+)$`, (m) => `${m[1]} غير صالح`],
  // Events
  [`^(.+) vs (.+)$`, (m, tr) => `${tr(m[1]!)} ضد ${tr(m[2]!)}`],
  [`^(\\w+) v (\\w+)$`, (m, tr) => `${tr(m[1]!)} ضد ${tr(m[2]!)}`],
  [`^(.+)\\. (.+) host (.+) at (.+)\\.$`, (m, tr) => `${parts(m[1]!, tr)}. يستضيف ${tr(m[2]!)} فريق ${tr(m[3]!)} على ${tr(m[4]!)}.`],
  [
    `^(.+) comes to (.+) for one night only — expect the hits, a few surprises and a full production\\.$`,
    (m, tr) => `${tr(m[1]!)} على ${tr(m[2]!)} لليلة واحدة فقط — أشهر الأغاني وبعض المفاجآت وإنتاج متكامل.`,
  ],
  [`^with special guests (.+)$`, (m, tr) => `بمشاركة ${tr(m[1]!)}`],
  [`^with (.+)$`, (m, tr) => `بمشاركة ${tr(m[1]!)}`],
  [`^Matchday (\\d+)$`, (m) => `الجولة ${m[1]}`],
  [`^Round of (\\d+)$`, (m) => `دور الـ ${m[1]}`],
  [`^(\\d+) days$`, (m) => `${m[1]} أيام`],
  [`^(\\d+)h (\\d+)m$`, (m) => `${m[1]} س ${m[2]} د`],
  [`^Kick-off ${TIME}$`, (m) => `انطلاق المباراة ${m[1]}`],
  [`^Gates open ${TIME}$`, (m) => `فتح البوابات ${m[1]}`],
  [`^Gates ${TIME}$`, (m) => `البوابات ${m[1]}`],
  [`^Gates ([\\d–-]+)$`, (m) => `البوابات ${m[1]}`],
  [`^Use Gate (\\d+)$`, (m) => `استخدم البوابة ${m[1]}`],
  [`^Doors open ${TIME}$`, (m) => `فتح الأبواب ${m[1]}`],
  [`^Doors ${TIME}$`, (m) => `الأبواب ${m[1]}`],
  [`^Show ${TIME}$`, (m) => `العرض ${m[1]}`],
  [`^(.+) fans only$`, (m, tr) => `لجماهير ${tr(m[1]!)} فقط`],
  [`^(.+) Fan IDs only$`, (m, tr) => `لبطاقات مشجعي ${tr(m[1]!)} فقط`],
  [`^(.+) supporters, separate entrance road\\.$`, (m, tr) => `جماهير ${tr(m[1]!)}، طريق دخول منفصل.`],
  [`^(\\d+) left$`, (m) => `تبقّى ${m[1]}`],
  [`^Max (\\d+) tickets per order\\.?$`, (m) => `الحد الأقصى ${m[1]} تذاكر في الطلب`],
  [`^${MONEY} EGP service fee per ticket$`, (m) => `رسوم خدمة ${m[1]} ج.م للتذكرة`],
  [`^A ${MONEY} EGP service fee per ticket is added at checkout\\.$`, (m) => `تُضاف رسوم خدمة ${m[1]} ج.م لكل تذكرة عند الدفع.`],

  [`^(.+) Please try again with clear photos\\.$`, (m) => `${m[1]} يُرجى المحاولة مرة أخرى بصور واضحة.`],
  [`^(RF-[\\w-]+) · your tickets are still valid\\.$`, (m) => `${m[1]} · تذاكرك ما زالت صالحة.`],
];

export const AR_PATTERNS: Pattern[] = RAW_PATTERNS.map(([source, build]) => [new RegExp(source, "i"), build]);
