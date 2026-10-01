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
  it("attaches the bearer token and drops the session on 401", async () => {
    const onUnauthorized = vi.fn();
    configureAuth({ get: () => "tok_123", onUnauthorized });
    const seen: string[] = [];
    const http = client((config) => {
      seen.push(String(config.headers.Authorization));
      return { status: 401, data: { error: { code: "UNAUTHORIZED", message: "Sign in to continue" } } };
    });
    await expect(http.get("/me")).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Sign in to continue" });
    expect(seen).toEqual(["Bearer tok_123"]);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    configureAuth({ get: () => null, onUnauthorized: () => {} });
  });
});

describe("endpoints", () => {
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
