/**
 * Content Security Policy with a per-request nonce for scripts (Next.js applies it to its own
 * scripts automatically). Inline style attributes are allowed: the design system and Radix use
 * them for dynamic values, and style injection can't run code.
 */
export function buildCsp(nonce: string, { dev, secure = true, reportUri }: { dev: boolean; secure?: boolean; reportUri?: string }) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    // The card form is the payment provider's page, reached through the BFF on this origin.
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Only over HTTPS: on plain-HTTP hosts (local runs) WebKit would upgrade the page's own scripts and break it.
    ...(!dev && secure ? ["upgrade-insecure-requests"] : []),
    ...(reportUri ? [`report-uri ${reportUri}`] : []),
  ];
  return directives.join("; ");
}

export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
