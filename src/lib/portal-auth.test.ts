import { beforeAll, expect, test } from "vitest";
import {
  hashRefresh,
  randomRefresh,
  signAccessToken,
  verifyAccessToken,
} from "./portal-auth";

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = "test-secret-at-least-32-chars-long-xxxx";
});

test("access token round-trips with portal claims", async () => {
  const token = await signAccessToken({
    customer_id: "11111111-1111-1111-1111-111111111111",
    org_id: "22222222-2222-2222-2222-222222222222",
    session_id: "33333333-3333-3333-3333-333333333333",
    email: "a@b.de",
  });
  const s = await verifyAccessToken(token);
  expect(s?.customer_id).toBe("11111111-1111-1111-1111-111111111111");
  expect(s?.session_id).toBe("33333333-3333-3333-3333-333333333333");
});

test("token signed with wrong secret fails", async () => {
  const token = await signAccessToken({
    customer_id: "1", org_id: "2", session_id: "3", email: "a@b.de",
  });
  process.env.SUPABASE_JWT_SECRET = "a-totally-different-secret-32-characters";
  expect(await verifyAccessToken(token)).toBeNull();
  process.env.SUPABASE_JWT_SECRET = "test-secret-at-least-32-chars-long-xxxx";
});

test("access token NEVER carries a `sub` claim (RLS safety: auth.uid() stays NULL)", async () => {
  const token = await signAccessToken({
    customer_id: "1", org_id: "2", session_id: "3", email: "a@b.de",
  });
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  expect(claims.sub).toBeUndefined();
  expect(claims.role).toBe("authenticated");
});

test("hashRefresh is deterministic; randomRefresh is 64 hex", () => {
  const r = randomRefresh();
  expect(r).toMatch(/^[a-f0-9]{64}$/);
  expect(hashRefresh(r)).toBe(hashRefresh(r));
});
