import { Suspense } from "react";
import { StaffFrame } from "@/components/staff-frame";

/**
 * Signed-in dashboard pages: session check, role menu and section permissions. The Suspense boundary
 * (for search params) is here, not in the root layout, so unknown paths still get a real 404 status.
 */
export default function StaffLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <Suspense>
      <StaffFrame>{children}</StaffFrame>
    </Suspense>
  );
}
