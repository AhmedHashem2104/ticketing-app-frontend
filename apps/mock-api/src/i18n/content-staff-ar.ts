/**
 * Arabic for the dashboard API (`/api/staff/*`): KPI labels, task lists, audit actions, scan results,
 * seeded organiser requests and the notifications staff decisions send to fans.
 */
export const AR_STAFF_CONTENT: Readonly<Record<string, string>> = {
  // Sign-in and permissions
  "Email or password is incorrect": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "Your role can't do this": "صلاحيات دورك لا تسمح بهذا الإجراء",
  "This account is suspended. Contact support.": "هذا الحساب موقوف. تواصل مع الدعم.",
  "Give a reason (at least 5 characters)": "اذكر السبب (5 أحرف على الأقل)",
  "Tell fans why (at least 5 characters)": "أخبر الجماهير بالسبب (5 أحرف على الأقل)",
  "Scan or paste the ticket QR": "امسح رمز QR للتذكرة أو الصقه",

  // Overview
  "Ticket revenue": "إيرادات التذاكر",
  "All events, before fees": "كل الفعاليات، قبل الرسوم",
  "Tickets sold": "التذاكر المباعة",
  "Fan accounts": "حسابات المشجعين",
  "Fan IDs to review": "بطاقات مشجعين للمراجعة",
  "Refunds to review": "استردادات للمراجعة",
  "Admitted today": "دخلوا اليوم",
  Orders: "الطلبات",
  "Checked in": "تم الدخول",
  "Resold tickets": "تذاكر أُعيد بيعها",
  "Fan IDs waiting for review": "بطاقات مشجعين بانتظار المراجعة",
  "Refund requests to decide": "طلبات استرداد بانتظار القرار",
  "Organiser requests": "طلبات المنظمين",

  // Organisers and payouts
  "Egyptian Football Association": "الاتحاد المصري لكرة القدم",
  Scheduled: "مجدولة",

  // Orders
  "Waiting for payment": "بانتظار الدفع",
  "Payment failed": "فشل الدفع",

  // Fan ID review
  "Face match below threshold": "تطابق الوجه أقل من الحد المطلوب",
  "Passport from outside Egypt": "جواز سفر صادر خارج مصر",
  "Photo slightly blurred": "الصورة غير واضحة قليلًا",
  "We couldn't approve your Fan ID": "لم نتمكن من الموافقة على بطاقة المشجع",
  "This Fan ID has already been decided": "تم البت في بطاقة المشجع هذه بالفعل",

  // Refunds
  "Event cancelled or postponed": "أُلغيت الفعالية أو تأجّلت",
  "Requested 40 minutes before the showtime.": "طُلب قبل موعد العرض بـ 40 دقيقة.",
  "Your refund is approved": "تمت الموافقة على طلب الاسترداد",
  "Your refund wasn't approved": "لم تتم الموافقة على طلب الاسترداد",
  "This refund has already been decided": "تم البت في طلب الاسترداد هذا بالفعل",

  // Entry
  Admitted: "تم الدخول",
  "Already used": "مستخدمة من قبل",
  "QR expired — ask for a fresh one": "انتهت صلاحية الرمز — اطلب رمزًا جديدًا",
  "Not a Matchpass ticket": "ليست تذكرة Matchpass",
  "Ticket isn't valid": "التذكرة غير صالحة",
  "No ticket left to scan for this event": "لا توجد تذاكر متبقية للمسح في هذه الفعالية",

  // Event changes and organiser requests
  "The headline act's flight was moved — we need two extra weeks.": "تغيّر موعد رحلة الفنان الرئيسي — نحتاج أسبوعين إضافيين.",
  "Security advice from the police — new date to follow.": "بناءً على توصية أمنية من الشرطة — سيُعلن الموعد الجديد لاحقًا.",
  "There's already a request waiting for this event": "يوجد طلب بانتظار القرار لهذه الفعالية بالفعل",
  "This request has already been decided": "تم البت في هذا الطلب بالفعل",
  "This event is already postponed": "هذه الفعالية مؤجلة بالفعل",
  "Only postponed events can go back on sale": "لا يمكن إعادة طرح إلا الفعاليات المؤجلة للبيع",

  // Audit log
  "Postponed event": "تأجيل فعالية",
  "Cancelled event": "إلغاء فعالية",
  "Put event back on sale": "إعادة طرح فعالية للبيع",
  "Approved refund": "الموافقة على استرداد",
  "Rejected refund": "رفض استرداد",
  "Approved Fan ID": "الموافقة على بطاقة مشجع",
  "Rejected Fan ID": "رفض بطاقة مشجع",
  "Requested cancellation": "طلب إلغاء",
  "Requested postponement": "طلب تأجيل",
  "Approved organiser request": "الموافقة على طلب منظم",
  "Rejected organiser request": "رفض طلب منظم",
  "Suspended account": "إيقاف حساب",
  "Reactivated account": "إعادة تفعيل حساب",
};
