import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bagianById } from "@/lib/data";

describe("llm (jembatan BFF Asisten AI)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("tanpa ANTHROPIC_API_KEY: null tanpa memanggil jaringan", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { jawabDenganLlm } = await import("@/lib/llm");
    expect(await jawabDenganLlm("apa fungsinya?", null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dengan kunci: memanggil API dengan prompt berkonteks, kunci hanya di header server", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-uji");
    vi.stubEnv("AI_MODEL", "claude-haiku-4-5-20251001");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ content: [{ type: "text", text: "  Aorta mengalirkan darah.  " }] }), {
        status: 200,
      }),
    );
    const { jawabDenganLlm, susunPromptSistem } = await import("@/lib/llm");
    const aorta = bagianById(5);
    expect(await jawabDenganLlm("apa fungsi aorta?", aorta)).toBe("Aorta mengalirkan darah.");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(((init?.headers ?? {}) as Record<string, string>)["x-api-key"]).toBe("sk-uji");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("claude-haiku-4-5-20251001");
    expect(body.system).toContain("Aorta");
    expect(body.messages[0]).toEqual({ role: "user", content: "apa fungsi aorta?" });
    expect(susunPromptSistem(null)).not.toContain("Konteks bagian");
  });

  it("status gagal, bentuk respons salah, atau jaringan putus -> null (cadangan lokal dipakai)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-uji");
    const { jawabDenganLlm } = await import("@/lib/llm");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    expect(await jawabDenganLlm("x", null)).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ salah: true }), { status: 200 }));
    expect(await jawabDenganLlm("x", null)).toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError("putus"));
    expect(await jawabDenganLlm("x", null)).toBeNull();
  });
});
