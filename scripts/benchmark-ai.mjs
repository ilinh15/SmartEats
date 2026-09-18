import { build } from 'esbuild';
import { loadEnv } from 'vite';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const env = loadEnv('development', process.cwd(), '');
const temp = await mkdtemp(join(tmpdir(), 'smarteats-benchmark-'));
try {
  const bundle = join(temp, 'prompt.mjs');
  await build({ entryPoints: ['src/lib/cookingRecommendations.ts'], bundle: true, platform: 'node', format: 'esm', outfile: bundle, define: { 'import.meta.env': '{}' } });
  const { buildCookingRecommendationPrompt } = await import(pathToFileURL(bundle));
  const providers = {
    gemini: { model: env.VITE_GEMINI_MODEL || 'gemini-3.6-flash', key: env.VITE_GEMINI_API_KEY },
    mistral: { model: env.VITE_MISTRAL_MODEL || 'mistral-small-latest', key: env.VITE_MISTRAL_API_KEY },
  };
  const results = [];
  const blocked = {};
  for (const [index, cuisine] of ['chinese', 'malay', 'indian', 'japanese', 'korean', 'western'].entries()) {
    const prompt = buildCookingRecommendationPrompt({ cuisine, mealType: 'dinner', userPreferences: ['Vegan'] });
    for (const provider of index % 2 ? ['mistral', 'gemini'] : ['gemini', 'mistral']) {
      const { model, key } = providers[provider];
      if (blocked[provider] || !key) {
        results.push({ provider, model, cuisine, skipped: blocked[provider] || 'Missing API key' });
        continue;
      }
      const start = performance.now();
      try {
        const isGemini = provider === 'gemini';
        const response = await fetch(isGemini
          ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
          : 'https://api.mistral.ai/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(45000),
          headers: { 'Content-Type': 'application/json', ...(isGemini ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }) },
          body: JSON.stringify(isGemini
            ? { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 8192, responseMimeType: 'application/json' } }
            : { model, messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 8192, response_format: { type: 'json_object' } }),
        });
        const data = await response.json();
        const seconds = Number(((performance.now() - start) / 1000).toFixed(2));
        if (!response.ok) {
          // Store status only; provider error text can contain sensitive request details.
          results.push({ provider, model, cuisine, seconds, status: response.status });
          if ([401, 403, 404, 429].includes(response.status)) blocked[provider] = `HTTP ${response.status} on initial request`;
          console.log(`${provider} ${cuisine}: HTTP ${response.status}, ${seconds}s`);
          continue;
        }
        const text = isGemini ? data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') : data.choices?.[0]?.message?.content;
        let recipes;
        try { recipes = JSON.parse(text).recommendations; } catch { recipes = null; }
        const usable = Array.isArray(recipes) ? recipes.filter(r => r && r.title && r.cuisine === cuisine && r.mealType === 'dinner' && Array.isArray(r.ingredients) && r.ingredients.length && Array.isArray(r.instructions) && r.instructions.length).length : 0;
        results.push({ provider, model, cuisine, seconds, status: response.status, usable, recipes, rawText: recipes ? undefined : text, finishReason: isGemini ? data.candidates?.[0]?.finishReason : data.choices?.[0]?.finish_reason });
        console.log(`${provider} ${cuisine}: ${usable}/4 usable, ${seconds}s`);
      } catch (error) {
        const seconds = Number(((performance.now() - start) / 1000).toFixed(2));
        results.push({ provider, model, cuisine, seconds, error: error.name, networkCode: error.cause?.code });
        console.log(`${provider} ${cuisine}: ${error.name} ${error.cause?.code || ''}`);
        if (error.cause?.code) blocked[provider] = `Network failure: ${error.cause.code}`;
      }
    }
  }
  const output = process.argv[2] || 'docs/benchmarks/ai-comparison.json';
  await writeFile(output, JSON.stringify({ runAt: new Date().toISOString(), methodology: 'One request per provider per cuisine; identical current four-recipe vegan dinner prompt; temperature 0.8; JSON mode; output cap 8192; 45-second timeout; alternating provider order; no image fetching or cache. Preference compliance requires manual review.', results }, null, 2));
  console.log(`Results saved to ${output}`);
} finally { await rm(temp, { recursive: true, force: true }); }
