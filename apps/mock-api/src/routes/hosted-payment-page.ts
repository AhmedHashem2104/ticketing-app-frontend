import { createFormatters, directionOf, htmlLangOf, type Locale } from "@repo/i18n";
import type { StoredOrder } from "../data/store";
import { contentTranslator } from "../i18n/localize";

/** The page's own copy in Arabic (the provider would localize its page the same way). */
const AR_PAGE: Record<string, string> = {
  "Card number": "رقم البطاقة",
  Expiry: "تاريخ الانتهاء",
  CVC: "رمز الأمان",
  "Name on card": "الاسم على البطاقة",
  "As printed on the card": "كما هو مطبوع على البطاقة",
  "Secure payment · Matchpass": "دفع آمن · ماتش باس",
  "MockPay secure checkout": "صفحة الدفع الآمنة من MockPay",
  "Test mode": "وضع الاختبار",
  "Pay with card": "الدفع بالبطاقة",
  "Payment summary": "ملخص الدفع",
  Order: "الطلب",
  Pay: "ادفع",
  "Cancel and go back": "إلغاء والعودة",
  "Check the highlighted field and try again.": "راجع الحقل المحدد وحاول مرة أخرى.",
  "Check the {count} highlighted fields and try again.": "راجع الحقول المحددة ({count}) وحاول مرة أخرى.",
  "Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. Matchpass never sees your card details.":
    "بطاقات الاختبار: 4242 4242 4242 4242 تنجح، و4000 0000 0000 0002 تُرفض. لا يرى ماتش باس بيانات بطاقتك أبدًا.",
  "Autofill:": "تعبئة تلقائية:",
  "test card that succeeds": "بطاقة اختبار ناجحة",
  "card that's declined": "بطاقة مرفوضة",
};

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

type Field = { name: string; label: string; autocomplete: string; inputmode?: string; placeholder: string };

const FIELDS: Field[] = [
  { name: "cardNumber", label: "Card number", autocomplete: "cc-number", inputmode: "numeric", placeholder: "1234 5678 9012 3456" },
  { name: "expiry", label: "Expiry", autocomplete: "cc-exp", inputmode: "numeric", placeholder: "MM / YY" },
  { name: "cvc", label: "CVC", autocomplete: "cc-csc", inputmode: "numeric", placeholder: "123" },
  { name: "nameOnCard", label: "Name on card", autocomplete: "cc-name", placeholder: "As printed on the card" },
];

/** Test cards the mock provider understands, for the development autofill links. */
export const TEST_CARDS = { success: "4242 4242 4242 4242", declined: "4000 0000 0000 0002" } as const;
export type TestCard = keyof typeof TEST_CARDS;

/** Prefilled card form values for a test card (expiry two years from now). */
export function testCardValues(card: TestCard, now = new Date()) {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String((now.getFullYear() + 2) % 100).padStart(2, "0");
  return { cardNumber: TEST_CARDS[card], expiry: `${mm} / ${yy}`, cvc: "123", nameOnCard: "Omar Khaled" };
}

/**
 * The mock payment provider's hosted card page. In production this is the provider's own domain
 * (e.g. Paymob), so card data never touches Matchpass servers. Works without JavaScript.
 */
export function hostedPaymentPage(input: {
  action: string;
  order: StoredOrder;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  /** Development only: links that reload the page with a test card filled in (works without JavaScript). */
  devAutofill?: boolean;
  locale?: Locale;
}) {
  const { action, order, errors = {}, values = {}, devAutofill = false, locale = "en" } = input;
  const content = contentTranslator(locale);
  const t = (text: string) => (locale === "ar" ? (AR_PAGE[text] ?? content(text)) : text);
  const money = createFormatters(locale).money;
  // Keep the language on links and the form post (`?lang=`), next to any other query.
  const withLang = (url: string) => (locale === "en" ? url : `${url}${url.includes("?") ? "&" : "?"}lang=${locale}`);
  const errorCount = Object.keys(errors).length;
  const fields = FIELDS.map((f) => {
    const error = errors[f.name];
    const id = `f-${f.name}`;
    return `<div class="field">
      <label for="${id}">${t(f.label)}</label>
      <input id="${id}" name="${f.name}" autocomplete="${f.autocomplete}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ""} placeholder="${escape(t(f.placeholder))}" value="${escape(values[f.name] ?? "")}" required ${error ? `aria-invalid="true" aria-describedby="${id}-error"` : ""}>
      ${error ? `<p class="error" id="${id}-error">${escape(t(error))}</p>` : ""}
    </div>`;
  }).join("");
  return `<!doctype html>
<html lang="${htmlLangOf(locale)}" dir="${directionOf(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${t("Secure payment · Matchpass")}</title>
<style>
  :root { color-scheme: light; font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; }
  body { margin: 0; background: #f2f1ec; color: #12140f; }
  main { max-width: 420px; margin: 0 auto; padding: 32px 16px; }
  .provider { font-size: 13px; color: #4a4d45; display: flex; justify-content: space-between; }
  h1 { font-size: 24px; margin: 8px 0 4px; }
  .summary { background: #fff; border: 1px solid #d9d8d0; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .summary strong { font-size: 22px; display: block; }
  .field { margin-bottom: 14px; }
  label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  input { width: 100%; box-sizing: border-box; font: inherit; padding: 12px; border: 1px solid #8a8c84; border-radius: 8px; background: #fff; }
  input:focus-visible, button:focus-visible { outline: 3px solid #1d5c3a; outline-offset: 2px; }
  input[aria-invalid="true"] { border-color: #a3201a; }
  .error { color: #a3201a; font-size: 13px; margin: 4px 0 0; }
  .alert { border: 1px solid #a3201a; background: #fdecea; color: #7d1712; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .pay { width: 100%; padding: 14px; font: inherit; font-weight: 700; border: 0; border-radius: 999px; background: #12140f; color: #fff; cursor: pointer; }
  .cancel { width: 100%; padding: 12px; margin-top: 8px; font: inherit; border: 0; background: none; text-decoration: underline; cursor: pointer; color: #12140f; }
  .note { font-size: 12px; color: #4a4d45; margin-top: 16px; }
  .dev { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border: 1px dashed #b88a00; background: #fff6d6; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 13px; }
  .dev a { color: #12140f; font-weight: 600; }
  .dev b { background: #12140f; color: #f2b705; font: 700 10px ui-monospace, monospace; padding: 2px 4px; border-radius: 3px; }
</style>
</head>
<body>
<main>
  <p class="provider"><span>${t("MockPay secure checkout")}</span><span>${t("Test mode")}</span></p>
  <h1>${t("Pay with card")}</h1>
  <section class="summary" aria-label="${t("Payment summary")}">
    <span>${escape(content(order.eventTitle))} · ${t("Order")} ${escape(order.reference)}</span>
    <strong>${money(order.total)}</strong>
  </section>
  ${errorCount ? `<div class="alert" role="alert">${errorCount === 1 ? t("Check the highlighted field and try again.") : t("Check the {count} highlighted fields and try again.").replace("{count}", String(errorCount))}</div>` : ""}
  ${
    devAutofill
      ? `<p class="dev"><b>DEV</b> ${t("Autofill:")} <a href="${withLang("?autofill=success")}">${t("test card that succeeds")}</a> · <a href="${withLang("?autofill=declined")}">${t("card that's declined")}</a></p>`
      : ""
  }
  <form method="post" action="${escape(withLang(action))}" novalidate>
    ${fields}
    <button class="pay" type="submit" name="intent" value="pay">${t("Pay")} ${money(order.total)}</button>
    <button class="cancel" type="submit" name="intent" value="cancel" formnovalidate>${t("Cancel and go back")}</button>
  </form>
  <p class="note">${t("Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. Matchpass never sees your card details.")}</p>
</main>
</body>
</html>`;
}
