import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

vi.mock("../database/pool", () => ({ pgPool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) } }));
vi.mock("../middleware/auditLog", () => ({ auditLog: (_req: unknown, _res: unknown, next: () => void) => next() }));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Vercel proxy rate limiting", () => {
  it("limits each forwarded client separately and ignores prepended spoofed addresses", async () => {
    vi.stubEnv("VERCEL", "1");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp();
    expect(app.get("trust proxy")).toBe(1);
    for (let i = 0; i < 60; i++) {
      const response = await request(app).get("/api/health").set("X-Forwarded-For", "203.0.113.10");
      expect(response.status).toBe(200);
    }
    expect((await request(app).get("/api/health").set("X-Forwarded-For", "198.51.100.1, 203.0.113.10")).status).toBe(429);
    expect((await request(app).get("/api/health").set("X-Forwarded-For", "203.0.113.11")).status).toBe(200);
    expect(errors).not.toHaveBeenCalled();
  });

  it("does not trust forwarded headers outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(createApp().get("trust proxy")).toBe(false);
  });
});
