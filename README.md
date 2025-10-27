# Bible MCP - Bible API with Hono & Drizzle ORM

A modern Bible API built with Hono, Drizzle ORM, and Turso (LibSQL). This project provides a fast, scalable API for accessing Bible translations and includes utilities for importing Bible XML data.

## Features

- **RESTful API** built with Hono framework
- **Turso/LibSQL** database for edge deployment
- **Drizzle ORM** for type-safe database queries
- **Multiple Bible translations** support
- **XML Parser** for importing USFX Bible files
- **Environment-based logging** with configurable log levels

## Database Schema

The project uses a normalized database design with three main tables:

1. **translations** - Stores Bible translation metadata (language, abbreviation, name, etc.)
2. **books** - Stores standardized Bible book information
3. **verses** - Stores all Bible verses linked to translations and books

## Prerequisites

- Node.js 18+ or Bun
- A Turso account (get one at https://turso.tech/)
- USFX XML Bible files for importing

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd versete-biblice
pnpm install
```

### 2. Set Up Turso Database

Create a new database on Turso:

```bash
turso db create versete-biblice
turso db show versete-biblice
turso db tokens create versete-biblice
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Turso credentials:

```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
PORT=3000
NODE_ENV=development
DEBUG=false
LOG_LEVEL=info
```

### 4. Push Database Schema

Generate and push the schema to your Turso database:

```bash
pnpm db:push
```

Or if you prefer migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Upload Bible Translations

Upload a Bible translation from an USFX XML file:

```bash
pnpm upload:translation -- bibles/raw/ron-rccv.usfx.xml "Romanian Corrected Cornilescu Version"
```

The script will:
- Parse the XML file
- Extract translation metadata
- Insert all books, chapters, and verses into the database
- Update translation statistics

### 6. Start the Development Server

```bash
pnpm dev
```

The API will be available at http://localhost:3000

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:push` | Push schema directly to database (no migrations) |
| `pnpm db:studio` | Open Drizzle Studio to view/edit data |
| `pnpm db:migrate` | Run database migrations |
| `pnpm upload:translation` | Upload a Bible translation from XML |
| `pnpm parse:bible` | Legacy parser (creates JSON files) |
| `pnpm deploy` | Deploy to Cloudflare Workers |

## API Endpoints

### Health Check

```http
GET /
```

Returns API status and version information.

### Translations

```http
GET /api/translations
```

Get all available Bible translations.

```http
GET /api/translations/:language
```

Get translations for a specific language (e.g., `ron`, `eng`).

```http
GET /api/translations/:language/:abbreviation
```

Get a specific translation (e.g., `/api/translations/ron/rccv`).

### Books

```http
GET /api/books
```

Get all Bible books.

```http
GET /api/books/:bookId
```

Get a specific book (e.g., `/api/books/GEN`).

```http
GET /api/books/testament/:testament
```

Get books by testament (`OT` or `NT`).

### Verses

```http
GET /api/verses/:language/:abbreviation/:bookId/:chapter
```

Get all verses in a chapter.

Example: `/api/verses/ron/rccv/GEN/1`

```http
GET /api/verses/:language/:abbreviation/:bookId/:chapter/:verse
```

Get a specific verse.

Example: `/api/verses/ron/rccv/GEN/1/1`

## XML File Format

The parser expects USFX (Unified Scripture Format XML) files with the naming convention:

```
{language}-{abbreviation}.usfx.xml
```

Examples:
- `ron-rccv.usfx.xml` - Romanian Corrected Cornilescu Version
- `eng-kjv.usfx.xml` - English King James Version
- `eng-esv.usfx.xml` - English Standard Version

## Project Structure

```
versete-biblice/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Database schema definitions
│   │   ├── client.ts          # Database client setup
│   │   └── index.ts           # DB exports
│   ├── routes/
│   │   ├── translations.ts    # Translation endpoints
│   │   ├── verses.ts          # Verse endpoints
│   │   └── books.ts           # Book endpoints
│   ├── services/
│   │   └── bible-parser.service.ts  # Bible upload service
│   ├── utils/
│   │   ├── book-names.ts      # Book metadata
│   │   ├── xml-parser.ts      # XML parsing utilities
│   │   └── logger.ts          # Logging utility
│   ├── scripts/
│   │   ├── upload-translation.ts  # CLI upload script
│   │   └── migrate.ts         # Migration runner
│   └── index.ts               # Main server file
├── drizzle/                   # Database migrations
├── bibles/
│   └── raw/                   # XML source files
├── drizzle.config.ts          # Drizzle configuration
├── package.json
└── README.md
```

## Logging

The project includes a configurable logging system:

- Set `DEBUG=true` to enable debug logs
- Set `LOG_LEVEL` to control verbosity: `debug`, `verbose`, `trace`, `info`, `warning`, `error`

Example:

```bash
DEBUG=true LOG_LEVEL=debug pnpm upload:translation -- bibles/raw/ron-rccv.usfx.xml
```

## Database Management

### View Data with Drizzle Studio

```bash
pnpm db:studio
```

This opens a web interface to browse and edit your database.

### Reset Database

If you need to reset a translation:

1. Delete the verses through Drizzle Studio or SQL
2. Re-upload the translation using the upload script

The upload script automatically cleans up existing verses before importing.

## Deployment

### Cloudflare Workers

The project is configured for deployment to Cloudflare Workers:

```bash
pnpm deploy
```

Make sure to set your environment variables in the Cloudflare dashboard or `wrangler.toml`.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the project conventions (see CONVENTIONS.md if available)
2. Keep functions small and focused
3. Use the logger utility for all logging
4. Ensure database operations use only upsert and delete patterns
5. Test thoroughly before submitting

## License

MIT License - see LICENSE file for details

## eBiblia.ro Downloader Tool

This project includes a comprehensive TypeScript downloader to extract and structure ALL Bible resources from eBiblia.ro, including verses, commentaries, dictionaries, topics, and cross-references.

### Quick Start

```bash
# Download demo data (sample Bible versions: Matthew & Mark only)
pnpm run download:ebiblia:demo

# Download COMPLETE database (WARNING: 200+ versions, several GB)
pnpm run download:ebiblia:full
```

### Unified Downloader: `ebiblia-downloader.ts`

A single TypeScript script with two modes:

**Demo Mode** (default):
- 3 Main Romanian Bible versions (ebvdcc, ebvba, ebgbvn)
- Limited to Matthew & Mark (books 40-41)
- Sample commentaries, dictionaries, topics
- ~5-10 minutes, ~50-100 MB
- Output: `./ebiblia_data/`

**Full Mode** (--full flag):
- 200+ Bible versions in multiple languages
- All 66 books (Genesis to Revelation)
- Complete commentaries for every verse
- Full dictionary (thousands of terms)
- All topics and thematic references
- Complete article database
- Several hours, 1-2 GB compressed
- Output: `./ebiblia_full_data/`

### Data Structure

The downloaded data is organized in a comprehensive JSON structure:

```json
{
  "metadata": {
    "downloadDate": "2025-10-27T...",
    "version": "2.0.0",
    "resourceCounts": {...}
  },
  "bibles": {
    "ebvdcc": {
      "id": "ebvdcc",
      "name": "Ediția D.Cornilescu Centenară",
      "books": {
        "40": {
          "name": "Matei",
          "chapters": {
            "001": {
              "verses": {
                "001": {
                  "text": "Cartea neamului lui Isus...",
                  "resources": {
                    "t1": "Title/Heading",
                    "x1": "Cross-reference 1",
                    "x2": "Cross-reference 2"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "commentaries": {...},
  "dictionaries": {...},
  "topics": {...},
  "crossReferences": {...},
  "index": {
    "byVerse": {...},
    "byTopic": {...},
    "byWord": {...},
    "byStrongs": {...}
  },
  "relationships": {
    "verseToTopics": {...},
    "verseToCommentaries": {...},
    "parallelVerses": {...}
  }
}
```

### API Documentation

See `EBIBLIA_ANALYSIS.md` for complete API documentation including:
- All endpoint patterns
- Resource type taxonomy
- URL encoding patterns
- Data volume estimates

### Resource Types Available

1. **Bible Versions** (200+)
   - Romanian: Cornilescu, Anania, GBVN, etc.
   - English: KJV, NIV, ESV, NASB, etc.
   - Other languages: Russian, Greek, Hebrew, etc.

2. **Commentaries**
   - Cultural-Historical Commentary (ebcci)
   - Verse-by-verse explanations

3. **Dictionaries**
   - Biblical Dictionary (db)
   - Theological Dictionary (dtc)
   - Encyclopedia entries (depb)

4. **Topics** (Hundreds)
   - Thematic verse collections
   - Subject-based references

5. **Articles** (3,691)
   - Bible articles
   - Theology articles
   - Study materials

### Configuration Options

Edit the CONFIG object in `src/scripts/ebiblia-downloader.ts`:

```typescript
const CONFIG: DownloadConfig = {
  hosts: [...],           // API servers (9 mirrors)
  basePath: "...",        // API auth path
  outputDir: "./data",    // Output directory (auto-set by mode)
  delay: 50,              // ms between requests
  maxRetries: 3,          // Retry failed requests
  concurrent: 10,         // Max concurrent downloads
  mode: 'demo'            // 'demo' or 'full' (auto-set by CLI flag)
};
```

**Command Line Usage:**
```bash
tsx src/scripts/ebiblia-downloader.ts           # Demo mode
tsx src/scripts/ebiblia-downloader.ts --full    # Full mode
```

### Performance & Requirements

**Demo Mode:**
- Time: ~5-10 minutes
- Size: ~50-100 MB
- Requests: ~500-1000

**Full Download:**
- Time: Several hours to days
- Size: 1-2 GB compressed, 5-10 GB uncompressed
- Requests: 100,000+
- Memory: 4GB+ recommended

### Rate Limiting & Ethics

- Default delay: 50-100ms between requests
- Concurrent requests: 10 (adjustable)
- Respects server capacity
- No authentication required (uses public API)
- Please use responsibly and consider supporting eBiblia.ro

### Output Files

```
ebiblia_data/
├── bibles/
│   ├── ebvdcc.json
│   ├── ebvba.json
│   └── ...
├── resources/
│   ├── commentaries.json
│   ├── dictionaries.json
│   ├── topics.json
│   └── articles.json
├── indexes/
│   ├── verse_index.json
│   ├── word_index.json
│   ├── relationships.json
│   └── cross_references.json
└── metadata.json
```

### Legal & Copyright Notice

- This tool is for educational/personal use
- Bible translations may be copyrighted
- Respect eBiblia.ro's terms of service
- Consider supporting the original website
- Use the data responsibly

## Support

For issues, questions, or contributions, please open an issue on GitHub.
