import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import config from "../../vite.config";

vi.mock("@vitejs/plugin-react-swc", () => ({ default: () => ({ name: "react-test" }) }));

vi.mock("vite", () => ({
  defineConfig: (value: unknown) => value,
  loadEnv: () => ({
    VITE_GEMINI_API_KEY: "test-gemini",
    VITE_GEMINI_MODEL: "test-model",
    VITE_MISTRAL_API_KEY: "test-mistral",
  }),
}));

afterEach(() => vi.unstubAllGlobals());

it("preserves dietary preferences through the local API and configures Mistral JSON output", async () => {
  const recipe = { title: "Tofu Rice", ingredients: ["Tofu", "Rice"], instructions: ["Cook rice and tofu."] };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('{"error":{"message":"Unavailable"}}', { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(recipe) } }] })));
  vi.stubGlobal("fetch", fetchMock);
  const resolved = (config as Function)({ mode: "development" });
  const plugin = resolved.plugins.find((entry: { name: string }) => entry.name === "dev-ai-recipe-api");
  let handler: Function;
  plugin.configureServer({ middlewares: { use: (_path: string, callback: Function) => { handler = callback; } } });
  const request = Object.assign(new EventEmitter(), { method: "POST" });
  const output = new Promise<string>((resolve) => {
    handler(request, { setHeader: vi.fn(), end: resolve });
    request.emit("data", JSON.stringify({ ingredients: ["Tofu", "Rice"], cuisine: "", userPreferences: ["Vegan"] }));
    request.emit("end");
  });
  expect(JSON.parse(await output)).toEqual({ provider: "mistral", recipe });
  const gemini = JSON.parse(fetchMock.mock.calls[0][1].body);
  const mistral = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(gemini.contents[0].parts[0].text).toContain("Vegan: do not include meat");
  expect(mistral.messages[0].content).toBe(gemini.contents[0].parts[0].text);
  expect(mistral.messages[0].content).toContain("Create a recipe using these ingredients: Tofu, Rice");
  expect(mistral.response_format).toEqual({ type: "json_object" });
  expect(mistral.max_tokens).toBe(gemini.generationConfig.maxOutputTokens);
});
