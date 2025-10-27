import {OpenAPIHono} from '@hono/zod-openapi';
import {swaggerUI} from '@hono/swagger-ui';
import {Scalar} from '@scalar/hono-api-reference';
import {createMarkdownFromOpenApi} from '@scalar/openapi-to-markdown';
import {logger} from 'hono/logger';
import {cors} from 'hono/cors';
import {prettyJSON} from 'hono/pretty-json';
import {translationsRoute} from './routes/translations.js';
import {passagesRoute} from './routes/passages.js';
import {referenceRoute} from './routes/reference.js';
import mcpRoute from './routes/mcp.js';

const app = new OpenAPIHono();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// Homepage - redirect to API docs
app.get('/', (c) => {
    return c.redirect('/api/docs');
});

// API v1 Routes - Bible
app.route('/api/v1/bible/translations', translationsRoute);
app.route('/api/v1/bible', passagesRoute);
app.route('/api/v1/bible', referenceRoute);

// MCP Server Route
app.route('/api/v1', mcpRoute);

// OpenAPI Documentation - dynamically set server URL
app.doc('/api/doc', (c) => {
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
        ],
    };
});

// Scalar API Reference (primary documentation)
app.get(
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
app.get('/api/swagger', swaggerUI({url: '/api/doc'}));

// LLMs.txt - AI-readable API documentation
app.get('/llms.txt', async (c) => {
    // Get the OpenAPI document
    const content = app.getOpenAPI31Document({
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

// 404 handler
app.notFound((c) => {
    return c.json({error: 'Not Found'}, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({error: 'Internal Server Error', message: err.message}, 500);
});

// Export for Cloudflare Workers
export default app;
