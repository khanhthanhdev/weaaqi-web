# Cloudflare Workers Setup

This project is configured to deploy to Cloudflare Workers.

## Prerequisites

1. Install Wrangler CLI (Cloudflare Workers CLI):
   ```bash
   npm install -g wrangler
   # or use npx: npx wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

## Configuration

The Cloudflare Workers configuration is in `wrangler.toml`. Key settings:

- **name**: Worker name (weaaqi-page)
- **main**: Entry point file (worker.js)
- **compatibility_date**: Required for Workers runtime
- **compatibility_flags**: Enables Node.js compatibility mode

## Environment Variables

Set your environment variables using Wrangler:

```bash
# Set OpenWeather API key
wrangler secret put OPENWEATHER_API_KEY

# Or set WEATHER_API_KEY
wrangler secret put WEATHER_API_KEY
```

You can also set variables in the Cloudflare Dashboard under Workers & Pages > your-worker > Settings > Variables.

## Development

Run the worker locally:

```bash
npm run worker:dev
```

Or directly with Wrangler:

```bash
wrangler dev
```

## Deployment

Deploy to Cloudflare Workers:

```bash
# Deploy to default environment
npm run worker:deploy

# Deploy to production environment
npm run worker:deploy:prod
```

Or directly with Wrangler:

```bash
wrangler deploy
wrangler deploy --env production
```

## Important Notes

### Limitations

1. **Puppeteer/Image Generation**: The `/api/image` endpoint is **not available** in Cloudflare Workers because:
   - Puppeteer requires Node.js APIs that aren't available in Workers
   - Workers don't support Chrome/Chromium execution
   
   **Alternatives for image generation:**
   - Use Cloudflare Images API
   - Use an external service (e.g., Screenshot API)
   - Deploy image generation to a different platform (Vercel, AWS Lambda)

2. **Static Assets**: CSS and images need to be served from:
   - Cloudflare R2 (recommended)
   - Workers KV (for small files)
   - External CDN
   - Cloudflare Pages (for static assets)

### Setting Up Static Assets

1. **Option 1: Cloudflare R2**
   - Create an R2 bucket
   - Upload `figma-to-html` folder contents
   - Configure public access
   - Update `ASSETS_BASE_URL` in `wrangler.toml` or as environment variable

2. **Option 2: Workers KV**
   - Create a KV namespace
   - Upload CSS file to KV
   - Update `wrangler.toml` with KV binding:
     ```toml
     [[kv_namespaces]]
     binding = "CSS_KV"
     id = "your-kv-namespace-id"
     ```

3. **Option 3: Embed CSS**
   - Read CSS file and embed directly in `worker.js`
   - Update `getCSS()` function to return embedded CSS

## Routes

- `GET /` - Main HTML page with weather data
- `GET /preview` - Preview HTML page
- `GET /health` - Health check endpoint
- `GET /api/image` - Returns error (not supported in Workers)

## Differences from Express Server

- Uses Fetch API instead of Express
- No file system access (use KV/R2 for assets)
- No Puppeteer support
- Environment variables accessed via `env` parameter
- Automatic edge deployment for global performance

## Troubleshooting

1. **Worker fails to start**: Check `wrangler.toml` syntax
2. **Missing environment variables**: Set secrets with `wrangler secret put`
3. **CSS not loading**: Configure KV/R2 bindings or embed CSS
4. **API errors**: Verify `OPENWEATHER_API_KEY` is set correctly

