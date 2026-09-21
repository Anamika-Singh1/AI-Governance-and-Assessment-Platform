import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authRouter from "../routes/auth";
import { pgPool } from "../database/pool";
import { errorHandler } from "../middleware/errorHandler";

vi.mock("../database/pool", () => ({ pgPool: { query: vi.fn() } }));

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use(errorHandler);

describe("registration validation", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    [{ name: " " }, "name"],
    [{ name: "a".repeat(81) }, "name"],
    [{ email: "invalid" }, "email"],
    [{ password: "short" }, "password"],
    [{ password: "a".repeat(129) }, "password"]
  ])("rejects invalid input with field details: %j", async (override, field) => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Test User", email: "test@example.com", password: "valid-password", ...override
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(response.body.details[0].path).toEqual([field]);
    expect(pgPool.query).not.toHaveBeenCalled();
  });

  it("accepts surrounding whitespace and sets a session after registration", async () => {
    vi.mocked(pgPool.query)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] } as never)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{
        id: "test-user", tenant_id: "test-tenant", email: "test@example.com", name: "Test User", role: "ASSESSOR"
      }] } as never);
    const response = await request(app).post("/api/auth/register").send({
      name: "  Test User  ", email: "  TEST@example.com  ", password: "valid-password"
    });
    expect(response.status).toBe(201);
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(pgPool.query).toHaveBeenNthCalledWith(1, expect.any(String), ["test@example.com"]);
    expect(pgPool.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      expect.any(String), "test@example.com", expect.any(String), "Test User"
    ]);
  });
});
