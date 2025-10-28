import {OpenAPIHono} from '@hono/zod-openapi';
import {swaggerUI} from '@hono/swagger-ui';
import {Scalar} from '@scalar/hono-api-reference';
import {createMarkdownFromOpenApi} from '@scalar/openapi-to-markdown';
import {logger} from 'hono/logger';
import {cors} from 'hono/cors';
import {prettyJSON} from 'hono/pretty-json';
import {cache} from 'hono/cache';
import {translationsRoute} from './routes/translations.js';
import {passagesRoute} from './routes/passages.js';
import {referenceRoute} from './routes/reference.js';
import {quotesRoute} from './routes/quotes.js';
import {dailyVerseRoute} from './routes/daily-verse.js';
import {dailyVersesRoute} from './routes/daily-verses.js';
import mcpRoute from './routes/mcp.js';
import {publicFormRoute} from './routes/public-form.js';
import {adminRoute} from './routes/admin.js';
import {ensureScheduledVerses} from './services/daily-verses.service.js';
import {Hono} from "hono";

const app = new Hono();
const api = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// Cache middleware for Bible API endpoints
app.get('/api/v1/bible/translations', cache({
    cacheName: 'bible-translations',
    cacheControl: 'public, s-maxage=3600, max-age=0, must-revalidate', // 1 hour
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

app.get('/api/v1/bible/*/passage', cache({
    cacheName: 'bible-passages',
    cacheControl: 'public, s-maxage=2592000, max-age=0, must-revalidate', // 30 days
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

app.get('/api/v1/bible/*/reference', cache({
    cacheName: 'bible-reference',
    cacheControl: 'public, s-maxage=2592000, max-age=0, must-revalidate', // 30 days
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

app.get('/api/v1/bible/quotes', cache({
    cacheName: 'bible-quotes',
    cacheControl: 'public, s-maxage=300, max-age=0, must-revalidate', // 5 minutes
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

app.get('/api/v1/bible/daily-verse', cache({
    cacheName: 'bible-daily-verse',
    cacheControl: 'public, s-maxage=3600, max-age=0, must-revalidate', // 1 hour
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

app.get('/api/v1/bible/daily-verses', cache({
    cacheName: 'bible-daily-verses',
    cacheControl: 'public, s-maxage=3600, max-age=0, must-revalidate', // 1 hour
    keyGenerator: (c) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const cacheVersion = (c.env?.CACHE_VERSION as string | undefined) ?? 'v1';
        return `${c.req.url}:${cacheVersion}`;
    },
}));

// Homepage - check for publica subdomain or serve API docs
app.get('/', async (c) => {
    const url = new URL(c.req.url);
    const hostname = url.hostname;

    // Check if accessed via publica subdomain
    if (hostname.startsWith('publica.') || hostname.startsWith('propune.')) {
        // Serve /publica content directly without redirect
        const publicaUrl = new URL('/publica', url.origin);
        return app.fetch(new Request(publicaUrl.toString(), c.req.raw));
    }

    return c.redirect('/api/docs');
});

// Public form route - accessible at /publica or publica.versete-biblice.ro
app.route('/publica', publicFormRoute);

// API v1 Routes - Bible
api.route('/api/v1/bible/translations', translationsRoute);
api.route('/api/v1/bible', passagesRoute);
api.route('/api/v1/bible', referenceRoute);
api.route('/api/v1/bible/quotes', quotesRoute);
api.route('/api/v1/bible/daily-verse', dailyVerseRoute);
api.route('/api/v1/bible/daily-verses', dailyVersesRoute);

// Admin API Routes
api.route('/api/v1/admin', adminRoute);

// MCP Server Route
api.route('/api/v1', mcpRoute);

// OpenAPI Documentation - dynamically set server URL
api.doc('/api/doc', (c) => {
    // Always extract origin from the actual request URL
    // This ensures the API docs always show the correct URL (dev or prod)
    const url = new URL(c.req.url);
    const baseUrl = url.origin;
    const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    return {
        openapi: '3.1.0',
        info: {
            title: 'versete-biblice.ro',
            version: '1.0.0',
            description: `
# MCP Configuration
To setup the MCP in your editor, use one of the below commands:

<details>
   <summary>MCP Inspector</summary>
   <p>Click <a href="https://mcp.ziziyi.com/inspector?serverUrl=${encodeURIComponent(`${baseUrl}/api/v1/mcp`)}&transport=streamable-http" target="_blank">here</a> to open MCP Inspector. </p>
</details>
<details>
   <summary>Claude Code</summary>
   <p><code class="hljs language-bash code-block-copy">claude mcp add --transport http --scope user versete-biblice ${baseUrl}/api/v1/mcp
</code></p>
</details>
<details>
   <summary>VS Code</summary>
   <p><code class="hljs language-bash code-block-copy">code --add-mcp "{\\"name\\":\\"versete-biblice\\",\\"type\\":\\"http\\",\\"url\\":\\"${baseUrl}/api/v1/mcp\\"}" 
</code></p>
</details>   


# llms.txt
You can access AI-readable API documentation at the following URL:
\`\`\`
${baseUrl}/llms.txt
\`\`\`


# Submit a Bible Translation
Want to contribute a new Bible translation to this API? Here's how:

1. **Prepare your submission:**
   - Package your Bible translation in a ZIP archive
   - Include a link or description of the license/copyright notice

2. **Send an email to:** hello@versete-biblice.ro with:
   - The ZIP archive attached
   - Bible name, release date and language
   - License/copyright information
   - Any relevant translation details

We'll review your submission and get back to you!


# Contribute on GitHub
This is an open-source project! If you want to contribute, check out the repository here:
[https://github.com/radio-crestin/versete-biblice.ro](https://github.com/radio-crestin/versete-biblice.ro)


      `,
        },
        servers: [
            {
                url: baseUrl,
                description: isLocalDev ? 'Local development server' : 'Production server',
            },
        ],
        tags: [
            {
                name: 'MCP Server',
                description: 'MCP server endpoints for Claude integration',
            },
            {
                name: 'Bible API',
                description: 'An API for accessing Bible translations and passages',
            },
            {
                name: 'Bible Quotes',
                description: 'User-generated Bible quotes with notes',
            },
            {
                name: 'Daily Bible Verses',
                description: 'Daily Bible verse scheduling and retrieval',
            },
            {
                name: 'Admin API',
                description: 'Admin API endpoints for system operations (requires authentication via token query parameter)',
            },
        ],
    };
});

// Scalar API Reference (primary documentation)
api.get(
    '/api/docs/*',
    Scalar((c) => {
        const url = new URL(c.req.url);
        const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

        return {
            url: '/api/doc',
            theme: 'default',
            hideClientButton: true,
            "defaultOpenAllTags": true,
            pathRouting: {
                basePath: '/api/docs',
            },
            defaultHttpClient: {
                targetKey: 'shell',
                clientKey: 'curl',
            },
            pageTitle: 'Versete Biblice API Documentation',
            proxyUrl: isLocalDev ? 'https://proxy.scalar.com' : undefined,
        };
    })
);

// Swagger UI (alternative documentation)
api.get('/api/swagger', swaggerUI({url: '/api/doc'}));

// LLMs.txt - AI-readable API documentation
api.get('/llms.txt', async (c) => {
    // Get the OpenAPI document
    const content = api.getOpenAPI31Document({
        openapi: '3.1.0',
        info: {
            title: 'Versete Biblice API',
            version: '1.0.0',
            description: 'A RESTful API for accessing Bible translations and passages with flexible range queries',
        },
    });

    // Convert to markdown
    const markdown = await createMarkdownFromOpenApi(JSON.stringify(content));

    return c.text(markdown);
});

app.route("/", api);

// 404 handler
app.notFound((c) => {
    return c.json({error: 'Not Found'}, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({error: 'Internal Server Error', message: err.message}, 500);
});

// Scheduled event handler for cron triggers
export const scheduled = async (_event: unknown, _env: unknown, _ctx: unknown): Promise<void> => {
    console.info('Cron trigger fired for daily verses scheduling');

    try {
        // Ensure verses are scheduled for the next 2 months (first run) or next month (subsequent runs)
        await ensureScheduledVerses();
        console.info('Daily verses scheduling completed successfully');
    } catch (error) {
        console.error('Error during scheduled verses update:', error);
    }
};

// Export for Cloudflare Workers
export default app;
