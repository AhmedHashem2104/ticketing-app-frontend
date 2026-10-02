"use client";

import { useReportWebVitals } from "next/web-vitals";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

// A stable module-level callback so metrics aren't reported twice.
const report = (metric: Metric) => {
  try {
    const body = JSON.stringify({
      type: "web-vital",
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      path: window.location.pathname,
    });
    navigator.sendBeacon?.("/monitoring", new Blob([body], { type: "application/json" }));
  } catch {
    // Monitoring is best effort.
  }
};

/** Reports Core Web Vitals (LCP, INP, CLS, TTFB, FCP) to `/monitoring`. */
export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
