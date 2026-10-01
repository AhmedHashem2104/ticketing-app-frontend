import { formatMoney } from "@repo/contracts";
import type { StoredOrder } from "../data/store";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

type Field = { name: string; label: string; autocomplete: string; inputmode?: string; placeholder: string };

const FIELDS: Field[] = [
  { name: "cardNumber", label: "Card number", autocomplete: "cc-number", inputmode: "numeric", placeholder: "1234 5678 9012 3456" },
  { name: "expiry", label: "Expiry", autocomplete: "cc-exp", inputmode: "numeric", placeholder: "MM / YY" },
  { name: "cvc", label: "CVC", autocomplete: "cc-csc", inputmode: "numeric", placeholder: "123" },
  { name: "nameOnCard", label: "Name on card", autocomplete: "cc-name", placeholder: "As printed on the card" },
];

/**
 * The mock payment provider's hosted card page. In production this is the provider's own domain
 * (e.g. Paymob), so card data never touches Matchpass servers. Works without JavaScript.
 */
export function hostedPaymentPage(input: { action: string; order: StoredOrder; errors?: Record<string, string>; values?: Record<string, string> }) {
  const { action, order, errors = {}, values = {} } = input;
  const errorCount = Object.keys(errors).length;
  const fields = FIELDS.map((f) => {
    const error = errors[f.name];
    const id = `f-${f.name}`;
    return `<div class="field">
      <label for="${id}">${f.label}</label>
      <input id="${id}" name="${f.name}" autocomplete="${f.autocomplete}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ""} placeholder="${f.placeholder}" value="${escape(values[f.name] ?? "")}" required ${error ? `aria-invalid="true" aria-describedby="${id}-error"` : ""}>
      ${error ? `<p class="error" id="${id}-error">${escape(error)}</p>` : ""}
    </div>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Secure payment · Matchpass</title>
<style>
  :root { color-scheme: light; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
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
</style>
</head>
<body>
<main>
  <p class="provider"><span>MockPay secure checkout</span><span>Test mode</span></p>
  <h1>Pay with card</h1>
  <section class="summary" aria-label="Payment summary">
    <span>${escape(order.eventTitle)} · Order ${escape(order.reference)}</span>
    <strong>${formatMoney(order.total)}</strong>
  </section>
  ${errorCount ? `<div class="alert" role="alert">Check the ${errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`} and try again.</div>` : ""}
  <form method="post" action="${escape(action)}" novalidate>
    ${fields}
    <button class="pay" type="submit" name="intent" value="pay">Pay ${formatMoney(order.total)}</button>
    <button class="cancel" type="submit" name="intent" value="cancel" formnovalidate>Cancel and go back</button>
  </form>
  <p class="note">Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. Matchpass never sees your card details.</p>
</main>
</body>
</html>`;
}
