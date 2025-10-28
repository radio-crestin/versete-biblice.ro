# Bible MCP Project Guidelines

## Development
- Do not run pnpm run dev, a server is already running at http://localhost:8787
- use pnpm
- before each commit run pnpm lint and fix any issues
- use drizzle orm for database interactions including migrations
- this project will be deployed to Cloudflare Workers, so ensure compatibility
- use typescript with strict mode enabled
- use tailwindcss for styling
- use @/ as the base path for imports
- use bibleTranslationSlug everywhere, not just translation
- for bibleTranslationSlug make sure to fetch the options in openapi like we did it for /api/v1/bible/{bibleTranslationSlug}/passage endpoint