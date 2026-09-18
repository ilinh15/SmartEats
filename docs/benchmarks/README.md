# Gemini / Mistral comparison

Run the same current SmartEats recommendation prompt against both configured models:

```sh
node scripts/benchmark-ai.mjs
```

The script reads local Vite environment configuration without printing keys. It makes up to 12 billable requests: one per provider for each of Chinese, Malay, Indian, Japanese, Korean, and Western cuisine. Requests ask for four vegan dinner recipes, use JSON mode, temperature 0.8, and an 8,192-token output limit. Provider order alternates. Each request has a 45-second timeout. Images, cache hits, and fallback requests are excluded from timing.

Results are saved in `ai-comparison.json`. A provider is skipped after an authentication, unavailable-model, rate-limit, or network failure. Successful results retain recipe content for manual review of dietary compliance, cuisine appropriateness, and completeness. Structural validity alone does not establish dietary compliance. One sample per cuisine is exploratory, not a statistically reliable quality ranking.

## Latest attempt

Both configured providers returned HTTP 429 on their first Chinese-cuisine request. The remaining ten requests were skipped. No recipes were generated, so neither recipe quality nor successful generation speed could be compared. The recorded times measure failed requests only. Retry after resolving provider quota/rate limits.
