#!/usr/bin/env bun
/**
 * Bun Static Site Server with Auto-Regeneration
 * Serves static files and regenerates HTML every 15 minutes
 */

import { serve, file } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';
import { generate, CONFIG } from './generate-static';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = join(process.cwd(), 'dist');
const PUBLIC_DIR = process.cwd();

// MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

function getMimeType(path: string): string {
    const ext = path.substring(path.lastIndexOf('.'));
    return MIME_TYPES[ext] || 'application/octet-stream';
}

// Try to serve a file from multiple directories
async function serveFile(pathname: string): Promise<Response | null> {
    // Normalize the pathname
    const normalizedPath = pathname === '/' ? '/index.html' : pathname;
    
    // Try dist directory first (for generated files)
    const distPath = join(DIST_DIR, normalizedPath);
    if (existsSync(distPath)) {
        const bunFile = file(distPath);
        return new Response(bunFile, {
            headers: {
                'Content-Type': getMimeType(normalizedPath),
                'Cache-Control': 'no-cache', // Don't cache generated files
            },
        });
    }

    // Try public directory (for static assets like icons)
    const publicPath = join(PUBLIC_DIR, normalizedPath);
    if (existsSync(publicPath)) {
        const bunFile = file(publicPath);
        return new Response(bunFile, {
            headers: {
                'Content-Type': getMimeType(normalizedPath),
                'Cache-Control': 'public, max-age=3600', // Cache static assets for 1 hour
            },
        });
    }

    return null;
}

// Initialize: generate static files on startup
async function initialize(): Promise<void> {
    console.log('🚀 Starting server initialization...');
    
    try {
        await generate();
        console.log('✓ Initial static files generated');
    } catch (error) {
        console.error('⚠ Initial generation failed, will serve fallback:', error);
    }
}

// Set up auto-regeneration every 15 minutes
function setupAutoRegeneration(): void {
    const intervalMs = CONFIG.refreshInterval;
    
    console.log(`🔄 Auto-regeneration scheduled every ${intervalMs / 60000} minutes`);
    
    setInterval(async () => {
        console.log(`\n[${new Date().toISOString()}] Starting scheduled regeneration...`);
        try {
            await generate();
        } catch (error) {
            console.error('Scheduled regeneration failed:', error);
        }
    }, intervalMs);
}

// Main server
async function main(): Promise<void> {
    await initialize();
    setupAutoRegeneration();

    const server = serve({
        port: PORT,
        
        async fetch(request: Request): Promise<Response> {
            const url = new URL(request.url);
            const pathname = url.pathname;

            // Log requests
            console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);

            // API endpoint to get raw data
            if (pathname === '/api/data') {
                const dataPath = join(DIST_DIR, 'data.json');
                if (existsSync(dataPath)) {
                    return new Response(file(dataPath), {
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                        },
                    });
                }
                return new Response(JSON.stringify({ error: 'Data not available yet' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // API endpoint to trigger manual regeneration
            if (pathname === '/api/regenerate' && request.method === 'POST') {
                try {
                    await generate();
                    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (error) {
                    return new Response(JSON.stringify({ error: String(error) }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            }

            // Health check endpoint
            if (pathname === '/health') {
                const dataPath = join(DIST_DIR, 'data.json');
                let lastGenerated = null;
                
                if (existsSync(dataPath)) {
                    try {
                        const data = await file(dataPath).json();
                        lastGenerated = data.generatedAt;
                    } catch {}
                }
                
                return new Response(JSON.stringify({
                    status: 'ok',
                    lastGenerated,
                    uptime: process.uptime(),
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Serve static files
            const response = await serveFile(pathname);
            if (response) {
                return response;
            }

            // SPA fallback - serve index.html for unknown routes
            const fallbackResponse = await serveFile('/index.html');
            if (fallbackResponse) {
                return fallbackResponse;
            }

            // 404 Not Found
            return new Response('Not Found', { status: 404 });
        },

        error(error: Error): Response {
            console.error('Server error:', error);
            return new Response('Internal Server Error', { status: 500 });
        },
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌤️  Weather & AQI Dashboard Server                       ║
║                                                            ║
║   → http://localhost:${PORT}/                                ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET  /           - Dashboard (auto-refreshed)          ║
║   • GET  /api/data   - Raw weather & AQI data              ║
║   • POST /api/regenerate - Force regeneration              ║
║   • GET  /health     - Health check                        ║
║                                                            ║
║   Auto-regeneration: Every 15 minutes                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
