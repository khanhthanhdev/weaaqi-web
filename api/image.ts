import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodeHtmlToImage from 'node-html-to-image';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
// Import chromium to ensure it's included in the bundle
import chromium from '@sparticuz/chromium';
import {
    fetchWeatherData,
    fetchAQIData,
    pickWeatherAction,
    pickAQIAction,
    getAqiActionForWeather,
    formatDate,
    formatTime,
    kmhFromMs,
    CONFIG,
    type WeatherData,
    type AQIData,
} from './weather-utils';

// Ensure chromium is loaded (prevents tree-shaking)
if (!chromium) {
    throw new Error('Failed to load @sparticuz/chromium package');
}

// Load template files
function loadTemplateFiles() {
    const templateDir = join(process.cwd(), 'figma-to-html');
    const htmlPath = join(templateDir, 'index.html');
    const cssPath = join(templateDir, 'css', 'main.css');
    const imagesDir = join(templateDir, 'images');
    
    const html = readFileSync(htmlPath, 'utf-8');
    const css = readFileSync(cssPath, 'utf-8');
    
    return { html, css, imagesDir };
}

// Convert image files to base64 data URLs
function convertImagesToDataUrls(imagesDir: string): Record<string, string> {
    const imageDataUrls: Record<string, string> = {};
    
    try {
        const imageFiles = readdirSync(imagesDir).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
        );
        
        for (const filename of imageFiles) {
            const imagePath = join(imagesDir, filename);
            const imageBuffer = readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');
            const ext = filename.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            imageDataUrls[filename] = `data:${mimeType};base64,${base64}`;
        }
    } catch (error) {
        console.warn('[image] Failed to load images, continuing without them:', error);
    }
    
    return imageDataUrls;
}

// Generate HTML from template with data replacements
function generateHTMLFromTemplate(
    templateHtml: string,
    templateCss: string,
    weather: WeatherData,
    aqi: AQIData,
    imageDataUrls: Record<string, string>
): string {
    const now = new Date();
    
    // Extract data
    const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
    const temp = Math.round(weather.main?.temp || 0);
    const feelsLike = Math.round(weather.main?.feels_like || temp);
    const humidity = weather.main?.humidity || 0;
    const windSpeed = kmhFromMs(weather.wind?.speed || 0);
    const weatherId = weather.weather?.[0]?.id || 800;
    const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
    
    // Get actions
    const weatherAction = pickWeatherAction(temp, humidity, weatherId);
    const baseAqiAction = pickAQIAction(pm25);
    const aqiAction = getAqiActionForWeather(baseAqiAction, temp);
    
    // Format date and time
    const dateStr = formatDate(now);
    const timeStr = formatTime(now);
    
    // Get AQI color based on status
    const aqiColor = baseAqiAction.color || '#ffc800';
    
    // Replace hardcoded values in template HTML
    let html = templateHtml;
    
    // Replace date and location in v13_6031 span
    html = html.replace(
        /<span class="v13_6031">NOV 24, 2025 \| HANOI, VIETNAM<\/span>/,
        `<span class="v13_6031">${dateStr} | ${CONFIG.locationLabel}</span>`
    );
    
    // Replace temperature in v29_74 span
    html = html.replace(
        /<span class="v29_74">26°C<\/span>/,
        `<span class="v29_74">${temp}°C</span>`
    );
    
    // Replace humidity in v25_24 span
    html = html.replace(
        /<span class="v25_24">48 %<\/span>/,
        `<span class="v25_24">${humidity} %</span>`
    );
    
    // Replace wind speed in v26_26 span
    html = html.replace(
        /<span class="v26_26">10<\/span>/,
        `<span class="v26_26">${windSpeed}</span>`
    );
    
    // Replace feels like in v25_25 span
    html = html.replace(
        /<span class="v25_25">26° C<\/span>/,
        `<span class="v25_25">${feelsLike}° C</span>`
    );
    
    // Replace update time in v36_35 span
    html = html.replace(
        /<span class="v36_35">Update at: 14:30<\/span>/,
        `<span class="v36_35">Update at: ${timeStr}</span>`
    );
    
    // Replace AQI value in v30_85 span (with color)
    html = html.replace(
        /<span class="v30_85">150<\/span>/,
        `<span class="v30_85" style="color: ${aqiColor}">${pm25}</span>`
    );
    
    // Replace AQI status in v30_86 span
    html = html.replace(
        /<span class="v30_86">UNHEALTHY<\/span>/,
        `<span class="v30_86">${baseAqiAction.status}</span>`
    );
    
    // Replace AQI status in v36_32 span (WEAR MASK)
    html = html.replace(
        /<span class="v36_32">WEAR MASK<\/span>/,
        `<span class="v36_32">${aqiAction.action.toUpperCase()}</span>`
    );
    
    // Replace hero action text in v26_31 span (BRING  UMBRELLA)
    const heroAction = weatherAction?.action?.toUpperCase() || '';
    html = html.replace(
        /<span class="v26_31">BRING  UMBRELLA<\/span>/,
        `<span class="v26_31">${heroAction}</span>`
    );
    
    // Replace condition in v29_75 span
    html = html.replace(
        /<span class="v29_75">RAIN\/STORM<\/span>/,
        `<span class="v29_75">${weatherAction?.condition?.toUpperCase() || description}</span>`
    );
    
    // Replace quote in v38_39 span
    html = html.replace(
        /<span class="v38_39">"A quiet sea never made a skilled sailor\."<\/span>/,
        `<span class="v38_39">"${CONFIG.quote}"</span>`
    );
    
    // Replace image URLs in CSS with data URLs
    let processedCss = templateCss;
    for (const [filename, dataUrl] of Object.entries(imageDataUrls)) {
        processedCss = processedCss.replace(
            new RegExp(`url\\("?\\.\\.\\/images\\/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?\\)`, 'g'),
            `url("${dataUrl}")`
        );
    }
    
    // Inline CSS
    html = html.replace(
        /<link href="\.\/css\/main\.css" rel="stylesheet" \/>/,
        `<style>${processedCss}</style>`
    );
    
    return html;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const startTime = Date.now();
    const isCronRequest = req.headers['user-agent']?.includes('vercel-cron') || 
                          req.headers['x-vercel-cron'] === '1';
    
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            console.error('[image] API key not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Always fetch the latest data (no caching on our side)
        console.log(`[image] ${isCronRequest ? '[CRON]' : '[REQUEST]'} Generating image with fresh data...`);
        
        // Fetch data
        let weather, aqi;
        try {
            console.log('[image] Fetching weather and AQI data...');
            [weather, aqi] = await Promise.all([
                fetchWeatherData(apiKey),
                fetchAQIData(apiKey),
            ]);
            console.log('[image] Data fetched successfully');
        } catch (fetchError) {
            const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
            console.error('[image] Failed to fetch data:', errorMessage);
            throw new Error(`Data fetch failed: ${errorMessage}`);
        }
        
        // Validate data
        if (!weather || !weather.main) {
            throw new Error('Invalid weather data received');
        }
        if (!aqi || !aqi.list || !aqi.list[0]) {
            throw new Error('Invalid AQI data received');
        }

        console.log('[image] Loading template files...');
        const { html: templateHtml, css: templateCss, imagesDir } = loadTemplateFiles();
        
        console.log('[image] Converting images to data URLs...');
        const imageDataUrls = convertImagesToDataUrls(imagesDir);
        
        console.log('[image] Generating HTML from template...');
        const html = generateHTMLFromTemplate(templateHtml, templateCss, weather, aqi, imageDataUrls);

        console.log('[image] Converting HTML to PNG...');
        
        // Configure Chromium for Vercel serverless
        const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
        let chromiumArgs: string[];
        let executablePath: string | undefined;
        
        try {
            if (isVercel) {
                // On Vercel, use chromium-min
                console.log('[image] Configuring Chromium for Vercel environment...');
                
                // Ensure chromium is available
                if (!chromium || !chromium.args) {
                    throw new Error('Chromium package not properly loaded');
                }
                
                chromiumArgs = chromium.args;
                console.log(`[image] Chromium args: ${chromiumArgs.length} arguments`);
                
                // Get executable path - handle both sync and async versions
                // On Vercel, we MUST have the executable path
                try {
                    if (typeof chromium.executablePath === 'function') {
                        // Try to call executablePath - it may throw if binary isn't extracted yet
                        try {
                            const pathResult = chromium.executablePath();
                            if (pathResult instanceof Promise) {
                                executablePath = await pathResult;
                            } else {
                                executablePath = pathResult as string;
                            }
                        } catch (extractionError) {
                            // The binary might need to be extracted first
                            // Try waiting a moment and retrying (extraction happens on first access)
                            console.warn('[image] Chromium binary extraction may be in progress, waiting...');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // Retry after waiting
                            const pathResult = chromium.executablePath();
                            if (pathResult instanceof Promise) {
                                executablePath = await pathResult;
                            } else {
                                executablePath = pathResult as string;
                            }
                        }
                    } else {
                        throw new Error('chromium.executablePath is not a function');
                    }
                    
                    if (!executablePath || executablePath.length === 0) {
                        throw new Error('Chromium executable path is empty');
                    }
                    
                    console.log(`[image] Chromium executable path resolved: ${executablePath}`);
                } catch (pathError) {
                    const pathErrorMsg = pathError instanceof Error ? pathError.message : String(pathError);
                    console.error('[image] Failed to get Chromium executable path:', pathErrorMsg);
                    console.error('[image] Chromium package info:', {
                        hasArgs: !!chromium.args,
                        hasExecutablePath: typeof chromium.executablePath === 'function',
                        executablePathType: typeof chromium.executablePath,
                        chromiumKeys: Object.keys(chromium || {}),
                        nodeVersion: process.version,
                        platform: process.platform,
                        arch: process.arch,
                    });
                    
                    // On Vercel, we cannot proceed without executable path
                    throw new Error(
                        `Failed to resolve Chromium executable path on Vercel: ${pathErrorMsg}. ` +
                        `The @sparticuz/chromium package binary files may not be included in the deployment. ` +
                        `Try: 1) Ensure @sparticuz/chromium is in dependencies (not devDependencies), ` +
                        `2) Check Vercel build logs to ensure the package is installed, ` +
                        `3) Verify the package version is compatible with Vercel's serverless environment.`
                    );
                }
            } else {
                // Local development
                console.log('[image] Configuring Chromium for local development...');
                chromiumArgs = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                ];
                executablePath = undefined; // Use system Chrome/Chromium
            }
        } catch (chromiumError) {
            const errorMessage = chromiumError instanceof Error ? chromiumError.message : String(chromiumError);
            console.error('[image] Chromium configuration error:', errorMessage);
            throw new Error(`Chromium setup failed: ${errorMessage}`);
        }
        
        // Prepare puppeteer args
        const puppeteerConfig: any = {
            args: chromiumArgs,
        };
        
        if (executablePath) {
            puppeteerConfig.executablePath = executablePath;
        }
        
        console.log('[image] Launching Puppeteer with config:', {
            argsCount: puppeteerConfig.args.length,
            hasExecutablePath: !!puppeteerConfig.executablePath,
            executablePath: puppeteerConfig.executablePath || 'using system default',
        });
        
        // Convert HTML to PNG using node-html-to-image
        let imageBuffer: Buffer;
        try {
            imageBuffer = await nodeHtmlToImage({
                html: html,
                type: 'png',
                quality: 100,
                puppeteerArgs: puppeteerConfig,
                waitUntil: 'networkidle0',
            }) as Buffer;
        } catch (imageGenError) {
            const errorMsg = imageGenError instanceof Error ? imageGenError.message : String(imageGenError);
            const errorStack = imageGenError instanceof Error ? imageGenError.stack : undefined;
            
            console.error('[image] Image generation failed:', errorMsg);
            if (errorStack) {
                console.error('[image] Stack trace:', errorStack);
            }
            console.error('[image] Puppeteer config used:', JSON.stringify(puppeteerConfig, null, 2));
            
            // Provide more helpful error message
            if (errorMsg.includes('does not exist') || errorMsg.includes('ENOENT')) {
                throw new Error(
                    `Chromium binary not found. This usually means @sparticuz/chromium binary files weren't included in the deployment. ` +
                    `Error: ${errorMsg}`
                );
            }
            
            throw new Error(`Image generation failed: ${errorMsg}`);
        }

        const generationTime = Date.now() - startTime;
        console.log(`[image] ${isCronRequest ? '[CRON]' : '[REQUEST]'} Image generated successfully in ${generationTime}ms`);

        // Set headers for optimal caching
        // Cache for 15 minutes (900 seconds) to match cron schedule
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900');
        res.setHeader('X-Generated-At', new Date().toISOString());
        
        // For cron requests, we still return the image but log it
        if (isCronRequest) {
            console.log(`[image] [CRON] Image pre-generated at ${new Date().toISOString()}`);
        }
        
        return res.send(imageBuffer);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[image] Error generating image:`, errorMessage);
        
        // Return error response
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to generate image', 
                details: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }
}
