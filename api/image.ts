import type { VercelRequest, VercelResponse } from '@vercel/node';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Fetch weather data
async function fetchWeatherData(apiKey: string) {
    const lat = 21.0285;
    const lon = 105.8542;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    return response.json();
}

// Fetch AQI data
async function fetchAQIData(apiKey: string) {
    const lat = 21.0285;
    const lon = 105.8542;
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(url);
    return response.json();
}

// Get AQI status
function getAqiStatus(pm25: number) {
    if (pm25 <= 12) return { status: 'GOOD', color: '#00e400' };
    if (pm25 <= 35.4) return { status: 'MODERATE', color: '#ffff00' };
    if (pm25 <= 55.4) return { status: 'UNHEALTHY (SG)', color: '#ff7e00' };
    if (pm25 <= 150.4) return { status: 'UNHEALTHY', color: '#ff0000' };
    if (pm25 <= 250.4) return { status: 'VERY UNHEALTHY', color: '#8f3f97' };
    return { status: 'HAZARDOUS', color: '#7e0023' };
}

// Format date
function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    }).toUpperCase();
}

// Format time
function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
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
        const [weather, aqi] = await Promise.all([
            fetchWeatherData(apiKey),
            fetchAQIData(apiKey),
        ]);
        
        // Validate data
        if (!weather || !weather.main) {
            throw new Error('Invalid weather data received');
        }
        if (!aqi || !aqi.list || !aqi.list[0]) {
            throw new Error('Invalid AQI data received');
        }

        const now = new Date();
        const temp = Math.round(weather.main?.temp || 0);
        const feelsLike = Math.round(weather.main?.feels_like || temp);
        const humidity = weather.main?.humidity || 0;
        const windSpeed = Math.round((weather.wind?.speed || 0) * 3.6);
        const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
        const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
        const aqiInfo = getAqiStatus(pm25);

        // Load Inter font (use woff2 format with proper URL)
        const fontResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff');
        if (!fontResponse.ok) {
            throw new Error('Failed to fetch font');
        }
        const fontData = await fontResponse.arrayBuffer();

        // Create SVG using satori
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        width: '800px',
                        height: '480px',
                        background: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'Inter',
                    },
                    children: [
                        // Header
                        {
                            type: 'div',
                            props: {
                                style: {
                                    background: '#1a1a1a',
                                    padding: '12px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                },
                                children: [
                                    {
                                        type: 'span',
                                        props: {
                                            style: { color: '#FFE601', fontSize: '20px', fontWeight: 'bold' },
                                            children: `${formatDate(now)} | HANOI, VIETNAM`,
                                        },
                                    },
                                ],
                            },
                        },
                        // Main content
                        {
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    flex: 1,
                                    padding: '20px',
                                },
                                children: [
                                    // Left side - Weather
                                    {
                                        type: 'div',
                                        props: {
                                            style: {
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                            },
                                            children: [
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { fontSize: '80px', fontWeight: 'bold' },
                                                        children: `${temp}°C`,
                                                    },
                                                },
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { fontSize: '24px', color: '#666', marginTop: '8px' },
                                                        children: description,
                                                    },
                                                },
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { display: 'flex', gap: '24px', marginTop: '24px' },
                                                        children: [
                                                            {
                                                                type: 'div',
                                                                props: {
                                                                    style: { display: 'flex', flexDirection: 'column' },
                                                                    children: [
                                                                        { type: 'span', props: { style: { fontSize: '14px', color: '#999' }, children: 'Humidity' } },
                                                                        { type: 'span', props: { style: { fontSize: '20px', fontWeight: 'bold' }, children: `${humidity}%` } },
                                                                    ],
                                                                },
                                                            },
                                                            {
                                                                type: 'div',
                                                                props: {
                                                                    style: { display: 'flex', flexDirection: 'column' },
                                                                    children: [
                                                                        { type: 'span', props: { style: { fontSize: '14px', color: '#999' }, children: 'Feels Like' } },
                                                                        { type: 'span', props: { style: { fontSize: '20px', fontWeight: 'bold' }, children: `${feelsLike}°C` } },
                                                                    ],
                                                                },
                                                            },
                                                            {
                                                                type: 'div',
                                                                props: {
                                                                    style: { display: 'flex', flexDirection: 'column' },
                                                                    children: [
                                                                        { type: 'span', props: { style: { fontSize: '14px', color: '#999' }, children: 'Wind' } },
                                                                        { type: 'span', props: { style: { fontSize: '20px', fontWeight: 'bold' }, children: `${windSpeed} km/h` } },
                                                                    ],
                                                                },
                                                            },
                                                        ],
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    // Right side - AQI
                                    {
                                        type: 'div',
                                        props: {
                                            style: {
                                                width: '220px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#f5f5f5',
                                                borderRadius: '12px',
                                                padding: '20px',
                                            },
                                            children: [
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { fontSize: '14px', color: '#666' },
                                                        children: 'Air Quality (PM2.5)',
                                                    },
                                                },
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { 
                                                            fontSize: '64px', 
                                                            fontWeight: 'bold',
                                                            color: aqiInfo.color,
                                                            marginTop: '8px',
                                                        },
                                                        children: `${pm25}`,
                                                    },
                                                },
                                                {
                                                    type: 'div',
                                                    props: {
                                                        style: { 
                                                            fontSize: '18px', 
                                                            fontWeight: 'bold',
                                                            color: aqiInfo.color,
                                                            marginTop: '8px',
                                                        },
                                                        children: aqiInfo.status,
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                        // Footer
                        {
                            type: 'div',
                            props: {
                                style: {
                                    background: '#1a1a1a',
                                    padding: '12px 24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                },
                                children: [
                                    {
                                        type: 'span',
                                        props: {
                                            style: { color: '#fff', fontSize: '14px' },
                                            children: 'INTRO TO CECS',
                                        },
                                    },
                                    {
                                        type: 'span',
                                        props: {
                                            style: { color: '#999', fontSize: '12px' },
                                            children: `Updated: ${formatTime(now)}`,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            {
                width: 800,
                height: 480,
                fonts: [
                    {
                        name: 'Inter',
                        data: fontData,
                        weight: 400,
                        style: 'normal',
                    },
                ],
            }
        );

        // Convert SVG to PNG using resvg
        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: 800,
            },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

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
        
        return res.send(Buffer.from(pngBuffer));
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
