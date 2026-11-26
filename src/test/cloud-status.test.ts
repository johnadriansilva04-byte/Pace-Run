import { describe, expect, it } from "vitest";
import { anonymousEnabled, cloudStatus, supabase } from "@/lib/supabase";

describe("anonymousEnabled", () => {
  it("aceita apenas a flag booleana ligada", () => {
    expect(anonymousEnabled({ external: { anonymous_users: true } })).toBe(true);
    expect(anonymousEnabled({ external: { anonymous_users: false } })).toBe(false);
    expect(anonymousEnabled({ external: {} })).toBe(false);
    expect(anonymousEnabled({})).toBe(false);
    expect(anonymousEnabled(null)).toBe(false);
    expect(anonymousEnabled("nada")).toBe(false);
  });
});

describe("cloudStatus", () => {
  it("sem variáveis de ambiente a nuvem está desligada", async () => {
    expect(supabase).toBeNull();
    expect(await cloudStatus()).toBe("off");
  });
});
