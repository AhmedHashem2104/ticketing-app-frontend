import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiRequestError, configureAuth, createApiClient, toApiError } from "./client";
import { createEndpoints } from "./endpoints";

type Reply = { status: number; data: unknown };

/** An axios client whose network layer is replaced by `reply`. */
function client(reply: (config: InternalAxiosRequestConfig) => Reply) {
  const http = createApiClient("/api");
  const adapter: AxiosAdapter = async (config) => {
    const { status, data } = reply(config);
    const response = { status, data, statusText: String(status), headers: {}, config };
    if (status >= 400) throw new AxiosError("Request failed", String(status), config, {}, response);
    return response;
  };
  http.defaults.adapter = adapter;
  return http;
}

describe("toApiError", () => {
  it("normalises the API error body", () => {
    const err = new AxiosError("x", "400", undefined, undefined, {
      status: 400,
      data: {
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: [{ path: "payment.cardNumber", message: "bad" }] },
      },
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    });
    const apiError = toApiError(err);
    expect(apiError).toBeInstanceOf(ApiRequestError);
    expect(apiError).toMatchObject({ status: 400, code: "VALIDATION_ERROR", message: "Invalid request body" });
    expect(apiError.fieldErrors).toEqual({ cardNumber: "bad" });
  });

  it("explains network failures and unknown errors", () => {
    expect(toApiError(new AxiosError("Network Error")).code).toBe("NETWORK_ERROR");
    expect(toApiError(new Error("boom")).message).toBe("boom");
  });
});

describe("api client", () => {
  it("never sends a bearer token (the BFF cookie carries the session) and reports expired sessions", async () => {
    const onUnauthorized = vi.fn();
    configureAuth({ onUnauthorized });
    const seen: unknown[] = [];
    const http = client((config) => {
      seen.push(config.headers.Authorization);
      return { status: 401, data: { error: { code: "UNAUTHORIZED", message: "Sign in to continue" } } };
    });
    await expect(http.get("/tickets")).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Sign in to continue" });
    expect(seen).toEqual([undefined]);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    // Probing the session on page load isn't an "expiry".
    await expect(http.get("/me")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    configureAuth({ onUnauthorized: () => {} });
  });
});

describe("endpoints", () => {
  it("treats a missing session as signed out, not an error", async () => {
    const api = createEndpoints(client(() => ({ status: 401, data: { error: { code: "UNAUTHORIZED", message: "Sign in" } } })));
    await expect(api.meOrNull()).resolves.toBeNull();
  });

  it("uploads Fan ID photos as multipart form data", async () => {
    let body: unknown;
    const api = createEndpoints(
      client((config) => {
        body = config.data;
        return { status: 200, data: { scanId: "s", nameEn: "Sara", nameAr: "سارة", idNumberMasked: "x", dateOfBirth: "y" } };
      }),
    );
    const front = new File(["x"], "front.jpg", { type: "image/jpeg" });
    await api.uploadFanIdDocuments({ documentType: "passport", front });
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("documentType")).toBe("passport");
    expect((body as FormData).get("front")).toBeInstanceOf(File);
    expect((body as FormData).has("back")).toBe(false);
  });

  it("validates responses against the shared contract", async () => {
    const api = createEndpoints(client(() => ({ status: 200, data: { subscribed: true } })));
    await expect(api.notify("x")).resolves.toEqual({ subscribed: true });

    const broken = createEndpoints(client(() => ({ status: 200, data: { featured: "nope" } })));
    await expect(broken.home()).rejects.toMatchObject({ code: "CONTRACT_ERROR" });
  });

  it("serialises browse filters into the query string", async () => {
    let url = "";
    const api = createEndpoints(
      client((config) => {
        url = config.url ?? "";
        return { status: 200, data: { items: [], total: 0, facets: { categories: [], cities: [] } } };
      }),
    );
    await api.events({ tab: "concerts", q: "jazz", categories: ["Festivals", "Comedy"], cities: ["cairo"], availableOnly: true });
    expect(url).toBe("/events?tab=concerts&q=jazz&categories=Festivals%2CComedy&cities=cairo&availableOnly=true");
  });

  it("encodes path parameters", async () => {
    let url = "";
    const api = createEndpoints(
      client((config) => {
        url = config.url ?? "";
        return { status: 204, data: null };
      }),
    );
    await api.withdrawListing("a/b");
    expect(url).toBe("/resale/listings/a%2Fb");
  });

  it("uses the shared axios defaults", () => {
    expect(axios.isAxiosError(new AxiosError("x"))).toBe(true);
  });
});
