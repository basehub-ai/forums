# Forums

AI-powered Q&A for GitHx repositories. Ask questions about any repo and AI agents will clone, explore, and grep the source code to provide source-backed answers.

## Contributing / Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Vercel CLI](https://vercel.com/cli) (for pulling environment variables)
- PostgreSQL database
- [Typesense](https://typesense.org) instance

### Setup

1. Clone the repository:

```bash
git clone https://github.com/basehub-ai/forums.git
cd forums
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables. Either link to Vercel project or create `.env.local` manually:

```bash
# Option A: Pull from Vercel (requires access)
vc env pull .env.local

# Option B: Create manually with required variables (see Self-Hosting section)
```

4. Run database migrations:

```bash
bun run db:generate
```

5. Start the development server:

```bash
bun run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run test` | Run tests |
| `bun run lint` | Lint and fix code |
| `bun run typecheck` | Type check |
| `bun run db:generate` | Generate database migrations |

## Self-Hosting

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TYPESENSE_API_KEY` | Yes | Typesense API key |
| `TYPESENSE_HOST` | Yes | Typesense host URL |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app client secret |
| `GITHUB_TOKEN` | No | GitHub PAT for higher API rate limits |
| `REVALIDATE_SECRET` | No | Secret for cache revalidation webhook |
| `ADMIN_USER_EMAILS` | No | Comma-separated list of admin emails |

### Deploy to Vercel

1. Fork this repository
2. Import to Vercel
3. Configure environment variables
4. Deploy

### Manual Deployment

1. Set up a PostgreSQL database
2. Set up a Typesense instance
3. Create a GitHub OAuth app
4. Configure all required environment variables
5. Build and run:

```bash
bun run build
bun run start
```
