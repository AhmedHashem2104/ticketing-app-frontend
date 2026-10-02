import { permissionsByRole, type StaffRole } from "@repo/contracts";
import { configureUI, UIProvider } from "@repo/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { staffApi } from "@/lib/api/staff";
import { StaffFrame } from "./staff-frame";

const nav = vi.hoisted(() => ({ pathname: "/en", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ lang: "en" }),
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
}));

const staff = (role: StaffRole) => ({
  id: "stf_1",
  name: "Tarek Mansour",
  initials: "TM",
  email: "ops@matchpass.app",
  role,
  permissions: [...permissionsByRole[role]],
});

function renderFrame(path: string) {
  nav.pathname = path;
  configureUI({ useLocale: () => "en" });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UIProvider>
        <StaffFrame>
          <h1>Section content</h1>
        </StaffFrame>
      </UIProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  vi.spyOn(staffApi, "overview").mockResolvedValue({
    kpis: [],
    sales: [],
    topEvents: [],
    tasks: [{ id: "fanid", label: "Fan IDs waiting for review", count: 4, href: "/fan-ids" }],
  });
});

describe("StaffFrame", () => {
  it("frames sections the role may open, with waiting-work counts", async () => {
    vi.spyOn(staffApi, "meOrNull").mockResolvedValue(staff("operations"));
    renderFrame("/en/fan-ids");
    expect(await screen.findByRole("heading", { name: "Section content" })).toBeInTheDocument();
    expect(await screen.findAllByText("4")).not.toHaveLength(0);
  });

  it("refuses sections outside the role, even by typed URL", async () => {
    vi.spyOn(staffApi, "meOrNull").mockResolvedValue(staff("operations"));
    renderFrame("/en/audit");
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Section content" })).not.toBeInTheDocument();
  });

  it("sends signed-out visitors to sign in and back", async () => {
    vi.spyOn(staffApi, "meOrNull").mockResolvedValue(null);
    renderFrame("/en/refunds");
    await vi.waitFor(() => expect(nav.replace.mock.calls[0]?.[0]).toBe("/en/login?next=%2Frefunds"));
  });
});
