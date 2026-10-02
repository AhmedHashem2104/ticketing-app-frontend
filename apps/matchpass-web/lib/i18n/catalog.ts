import type { Catalog } from "@repo/i18n";

/** Arabic copy specific to the web app (page titles, app-only messages), keyed by the English source. */
export const appCatalog: Catalog = {
  // ---------- Site and metadata ----------
  "Matchpass — Official tickets for matches, concerts & events": "ماتش باس — التذاكر الرسمية للمباريات والحفلات والفعاليات",
  "%s · Matchpass": "%s · ماتش باس",
  "Official tickets for football, concerts and live events in Egypt. Fan ID, waiting rooms, official resale and refunds.":
    "التذاكر الرسمية لكرة القدم والحفلات والفعاليات الحية في مصر. بطاقة المشجع، وقاعات الانتظار، وإعادة البيع الرسمية، والاسترداد.",
  "Matches, concerts & events": "المباريات والحفلات والفعاليات",
  Event: "فعالية",
  "{headline}. Tickets from {price} on Matchpass.": "{headline}. التذاكر تبدأ من {price} على ماتش باس.",
  "Waiting room": "قاعة الانتظار",
  "Pick your seats": "اختر مقاعدك",
  "Order confirmed": "تم تأكيد الطلب",
  "An unexpected error occurred. Please try again.": "حدث خطأ غير متوقع. حاول مرة أخرى.",
  "We can't reach Matchpass right now. Check your connection and try again.":
    "تعذّر الوصول إلى ماتش باس حاليًا. تحقق من اتصالك وحاول مرة أخرى.",
  "Something went wrong. Please try again.": "حدث خطأ ما. حاول مرة أخرى.",
  "We received an unexpected response. Please try again.": "تلقّينا ردًا غير متوقع. حاول مرة أخرى.",

  // ---------- Header and footer ----------
  Resale: "إعادة البيع",
  "Account & preferences": "الحساب والتفضيلات",
  "Official tickets for football, concerts and live events.": "التذاكر الرسمية لكرة القدم والحفلات والفعاليات الحية.",
  "© {year} Matchpass. Prices in Egyptian pounds and include VAT.": "© {year} ماتش باس. الأسعار بالجنيه المصري وتشمل ضريبة القيمة المضافة.",
  Fans: "المشجعون",
  Organisers: "المنظِّمون",
  "Sell tickets with us": "بِع تذاكرك معنا",
  "Organiser log in": "دخول المنظِّمين",
  Fees: "الرسوم",
  "Help & legal": "المساعدة والشؤون القانونية",
  "Help centre": "مركز المساعدة",
  "Terms of sale": "شروط البيع",
  "Refund policy": "سياسة الاسترداد",
  "Privacy policy": "سياسة الخصوصية",
  "Contact us": "اتصل بنا",
  "Contact support": "تواصل مع الدعم",
  "Page not found": "الصفحة غير موجودة",
  "The page you're looking for doesn't exist or isn't available right now.": "الصفحة التي تبحث عنها غير موجودة أو غير متاحة حاليًا.",
  "Go to the home page": "الذهاب إلى الصفحة الرئيسية",
  "We couldn't find that": "لم نعثر على ما تبحث عنه",
  "It may have been removed, or the link might be wrong.": "ربما أُزيل، أو أن الرابط غير صحيح.",

  // ---------- Home and events ----------
  "Loading events": "جارٍ تحميل الفعاليات",
  "Loading event": "جارٍ تحميل الفعالية",
  "Join the waiting room": "ادخل قاعة الانتظار",
  "Get tickets": "احصل على التذاكر",
  "Match details": "تفاصيل المباراة",
  "Lineup & info": "البرنامج والمعلومات",
  "NEEDED FOR FOOTBALL MATCHES": "مطلوبة لمباريات كرة القدم",
  "Get your Fan ID in five minutes": "احصل على بطاقة المشجع في خمس دقائق",
  "Scan your national ID or passport and take a selfie. Link family and friends so you can buy for them too.":
    "صوّر بطاقة الرقم القومي أو جواز السفر والتقط صورة شخصية. اربط عائلتك وأصدقاءك لتشتري لهم أيضًا.",
  "Start verification": "ابدأ التحقق",
  "We couldn't set that reminder. Please try again.": "تعذّر ضبط التذكير. حاول مرة أخرى.",
  "Cancelled — tickets refunded automatically": "أُلغيت — تم استرداد قيمة التذاكر تلقائيًا",
  "Postponed — new date to be announced": "تأجّلت — سيُعلن الموعد الجديد",
  "Not on sale yet — browse others": "لم يبدأ البيع بعد — تصفّح غيرها",
  "Sold out — buy on official resale": "نفدت التذاكر — اشترِ من إعادة البيع الرسمية",
  "Sold out — browse others": "نفدت التذاكر — تصفّح غيرها",
  "Your Fan ID is approved": "تمت الموافقة على بطاقة المشجع",
  "{count, plural, one {# linked fan ready} other {# linked fans ready}}: {names}":
    "{count, plural, one {مشجع مرتبط واحد جاهز} two {مشجعان مرتبطان جاهزان} few {# مشجعين مرتبطين جاهزون} many {# مشجعًا مرتبطًا جاهزون} other {# مشجع مرتبط جاهزون}}: {names}",
  "Link family and friends to buy for them too.": "اربط عائلتك وأصدقاءك لتشتري لهم أيضًا.",
  "You need an approved Fan ID for this match": "تحتاج إلى بطاقة مشجع معتمدة لهذه المباراة",
  "Sign in with an approved Fan ID to buy": "سجّل الدخول ببطاقة مشجع معتمدة للشراء",

  // ---------- Buying ----------
  "Loading tickets": "جارٍ تحميل التذاكر",
  "Not on sale yet": "لم يبدأ البيع بعد",
  "Every ticket for this event has been sold.": "بيعت كل تذاكر هذه الفعالية.",
  "Tickets for this event aren't on sale yet. Set a reminder on the event page.":
    "لم يبدأ بيع تذاكر هذه الفعالية بعد. اضبط تذكيرًا من صفحة الفعالية.",
  "Back to the event": "العودة إلى الفعالية",
  "You need a Fan ID": "تحتاج إلى بطاقة مشجع",
  "Every match ticket is tied to an approved Fan ID. It takes about five minutes.":
    "كل تذكرة مباراة مرتبطة ببطاقة مشجع معتمدة. يستغرق الحصول عليها نحو خمس دقائق.",
  "Loading the venue map": "جارٍ تحميل خريطة المكان",
  "Up to {max} seats per order.": "حتى {max} مقاعد في الطلب الواحد.",
  "Up to {max} seats per booking.": "حتى {max} مقاعد في الحجز الواحد.",
  "Loading the stadium map": "جارٍ تحميل خريطة الاستاد",
  "Seat picking isn't available": "اختيار المقاعد غير متاح",
  "This venue sells tickets by type.": "يبيع هذا المكان التذاكر حسب النوع.",
  "You can pick up to {max} seats — one for each Fan ID on your order.": "يمكنك اختيار حتى {max} مقاعد — مقعد لكل بطاقة مشجع في طلبك.",
  "Opening the waiting room": "جارٍ فتح قاعة الانتظار",
  "{count, plural, one {Your Fan ID and # linked fan are ready.} other {Your Fan ID and # linked fans are ready.}}":
    "{count, plural, one {بطاقتك ومشجع مرتبط واحد جاهزة.} two {بطاقتك ومشجعان مرتبطان جاهزة.} few {بطاقتك و# مشجعين مرتبطين جاهزة.} many {بطاقتك و# مشجعًا مرتبطًا جاهزة.} other {بطاقتك و# مشجع مرتبط جاهزة.}}",
  "Your Fan ID is ready.": "بطاقة المشجع الخاصة بك جاهزة.",
  "Loading your order": "جارٍ تحميل طلبك",
  "Your hold has ended": "انتهت مدة حجزك",
  "We held your tickets for 10 minutes. They've gone back on sale — choose again to continue.":
    "حجزنا تذاكرك لمدة 10 دقائق، وقد عادت للبيع — اختر مرة أخرى للمتابعة.",
  "Your bank declined the payment. Try another card or payment method.": "رفض بنكك عملية الدفع. جرّب بطاقة أو طريقة دفع أخرى.",
  "Payment cancelled — you haven't been charged. Choose how you'd like to pay.":
    "أُلغي الدفع — لم يُخصم منك شيء. اختر طريقة الدفع التي تفضّلها.",
  "That payment session expired. Please try again.": "انتهت جلسة الدفع. حاول مرة أخرى.",
  "MATCHPASS — RECEIPT": "ماتش باس — إيصال",
  "Order {reference}": "الطلب {reference}",

  // ---------- Account ----------
  "One account for every match and every show": "حساب واحد لكل مباراة وكل عرض",
  "Get alerts the moment your club or artist goes on sale": "تلقَّ تنبيهًا فور بدء بيع تذاكر ناديك أو فنانك",
  "Pay with card, wallet, InstaPay or Fawry": "ادفع بالبطاقة أو المحفظة أو إنستاباي أو فوري",
  "Tickets on your phone — transfer or resell safely": "تذاكرك على هاتفك — حوّلها أو أعد بيعها بأمان",
  "Next we'll set up your Fan ID — you need it for football matches. You can skip it if you only buy concert tickets.":
    "بعد ذلك سنجهّز بطاقة المشجع — تحتاجها لمباريات كرة القدم. يمكنك تخطّيها إذا كنت تشتري تذاكر الحفلات فقط.",
  "Your password was changed. You're signed in on this device only.": "تم تغيير كلمة المرور. أنت مسجّل الدخول على هذا الجهاز فقط.",
  "Log in to continue.": "سجّل الدخول للمتابعة.",
  "QR codes, transfers and resale": "رموز QR والتحويلات وإعادة البيع",
  "Accept tickets sent to you": "اقبل التذاكر المُرسلة إليك",
  "Request and track refunds": "اطلب الاستردادات وتابعها",
  "Orders, transfers and event updates": "الطلبات والتحويلات وتحديثات الفعاليات",
  "Fan ID, payments and entry": "بطاقة المشجع والدفع والدخول",

  // ---------- Tickets and transfers ----------
  "Loading your tickets": "جارٍ تحميل تذاكرك",
  Upcoming: "القادمة",
  "Upcoming ({count})": "القادمة ({count})",
  Past: "السابقة",
  "Refunds ({count})": "الاستردادات ({count})",
  "Ticket sent": "تم إرسال التذكرة",
  "They have 24 hours to accept. Until they do, you can cancel the transfer from the ticket.":
    "أمامه 24 ساعة للقبول. وحتى يقبل يمكنك إلغاء التحويل من التذكرة.",
  "Wallet passes are coming soon": "بطاقات المحفظة قادمة قريبًا",
  "For now, show the QR from My tickets at the gate.": "في الوقت الحالي، اعرض رمز QR من «تذاكري» عند البوابة.",
  "Ticket not found": "التذكرة غير موجودة",
  "This ticket isn't in your upcoming tickets. It may have been transferred, resold or refunded.":
    "هذه التذكرة ليست ضمن تذاكرك القادمة. ربما حُوّلت أو أُعيد بيعها أو استُردت قيمتها.",
  "Ticket accepted — it's in My tickets now.": "تم قبول التذكرة — أصبحت في «تذاكري» الآن.",
  "Transfer declined. The ticket went back to the sender.": "تم رفض التحويل. عادت التذكرة إلى المُرسل.",
  "Transfer cancelled — the ticket is yours again.": "تم إلغاء التحويل — عادت التذكرة إليك.",

  // ---------- Resale and refunds ----------
  "Your ticket": "تذكرتك",
  "{name}'s ticket": "تذكرة {name}",
  "Your InstaPay address": "عنوان إنستاباي الخاص بك",
  "Bank account": "حساب بنكي",
  "Add IBAN": "أضف رقم IBAN",
  "Listed for {price}. You'll receive {payout} when it sells.": "تم العرض مقابل {price}. ستحصل على {payout} عند البيع.",
  "Listing withdrawn — the ticket is yours again.": "تم سحب العرض — عادت التذكرة إليك.",
  "List your ticket at up to face value. Touting above face value isn't allowed.":
    "اعرض تذكرتك بسعر لا يتجاوز السعر الأصلي. البيع بأعلى منه غير مسموح.",
  "When someone buys it, your QR stops working and theirs is issued — tied to their Fan ID or account.":
    "عندما يشتريها أحد يتوقف رمز QR الخاص بك ويُصدر رمزه — مرتبطًا ببطاقة المشجع أو حسابه.",
  "Money arrives within 2 working days after the sale.": "يصل المبلغ خلال يومَي عمل بعد البيع.",
  "Not sold by 6 hours before the event? The listing ends and the ticket stays yours.":
    "لم تُبع قبل الفعالية بـ 6 ساعات؟ ينتهي العرض وتبقى التذكرة لك.",
  "Choose an order to refund": "اختر طلبًا لاسترداد قيمته",
  "Start a refund from the ticket in My tickets.": "ابدأ الاسترداد من التذكرة في «تذاكري».",
  "No refundable tickets": "لا توجد تذاكر قابلة للاسترداد",
  "None of the tickets on order {reference} can be refunded right now. You can still sell them on official resale.":
    "لا يمكن استرداد قيمة أي من تذاكر الطلب {reference} حاليًا. لا يزال بإمكانك بيعها عبر إعادة البيع الرسمية.",
  "MATCHPASS REFUND": "ماتش باس — استرداد",
  Amount: "المبلغ",
  Status: "الحالة",
  "Full refund, fees included, if the match is cancelled, postponed or played without fans. Otherwise use official resale.":
    "استرداد كامل شامل الرسوم إذا أُلغيت المباراة أو تأجّلت أو أُقيمت دون جمهور. وفي غير ذلك استخدم إعادة البيع الرسمية.",
  "Refund of the ticket price up to 7 days before the show (organiser's policy). Full refund if cancelled.":
    "استرداد سعر التذكرة حتى 7 أيام قبل العرض (سياسة المنظِّم). استرداد كامل عند الإلغاء.",
  "Refund up to 2 hours before the showtime. After that, tickets can't be refunded.":
    "الاسترداد متاح حتى ساعتين قبل موعد العرض، وبعدها لا يمكن استرداد التذاكر.",
  "Loading resale tickets": "جارٍ تحميل تذاكر إعادة البيع",
};
