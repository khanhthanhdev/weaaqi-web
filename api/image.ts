import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodeHtmlToImage from 'node-html-to-image';
import chromium from '@sparticuz/chromium';

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

// Format date (e.g., "NOV 24, 2025")
function formatDate(date: Date) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}

// Weather action rules
const WEATHER_ACTIONS = [
    { tempMax: 5, humidityMin: 0, weatherCodes: [511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], action: "Stay warm, have warm tea. Extreme cold.", condition: "Severe Winter Weather", iconKey: "cold" },
    { tempMax: 5, humidityMin: 0, weatherCodes: [800, 801, 802, 803, 804], action: "Stay warm, have warm tea.", condition: "Freezing Cold", iconKey: "cold" },
    { tempMax: 10, humidityMin: 0, weatherCodes: null as number[] | null, action: "Warm tea recommended. Stay cozy.", condition: "Cold", iconKey: "tea" },
    { tempMax: 15, humidityMin: 70, weatherCodes: null as number[] | null, action: "Wear warm layers. Stay dry.", condition: "Chilly & Damp", iconKey: "warm" },
    { tempMin: 35, humidityMin: 50, weatherCodes: null as number[] | null, action: "Wear sunglasses, stay hydrated.", condition: "Very Hot", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 75, weatherCodes: null as number[] | null, action: "Wear sunglasses, drink water often.", condition: "Extreme Humidity/Muggy", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 50, weatherCodes: null as number[] | null, action: "Wear sunglasses, drink water.", condition: "Very Hot & Humid", iconKey: "sunglasses" },
    { tempMin: 30, humidityMax: 40, weatherCodes: null as number[] | null, action: "Wear sunglasses, hydrate constantly.", condition: "Hot & Dry", iconKey: "sunglasses" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232], action: "Bring umbrella. Severe T-Storm.", condition: "Thunderstorm", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [502, 503, 504, 522], action: "Bring umbrella. Heavy rain.", condition: "Heavy Rain", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [300, 301, 302, 310, 311, 312, 313, 314, 321, 500, 501, 520, 521, 531], action: "Bring umbrella.", condition: "Rain/Drizzle", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [701, 711, 721, 741], action: "Low visibility, wear mask if smoky.", condition: "Mist/Fog/Haze", iconKey: "haze" },
    { tempMin: 25, tempMax: 35, humidityMax: 40, weatherCodes: [800, 801], action: "Wear sunglasses. Great day!", condition: "Sunny", iconKey: "sunglasses" },
    { tempMin: 15, tempMax: 30, humidityMax: 40, weatherCodes: null as number[] | null, action: "Enjoy outdoors, stay hydrated.", condition: "Pleasant & Dry", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 70, weatherCodes: null as number[] | null, action: "Comfortable day. Light walk.", condition: "Warm & Humid", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 41, humidityMax: 69, weatherCodes: null as number[] | null, action: "Perfect weather! Enjoy!", condition: "Ideal Comfort", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [800, 801, 802, 803, 804], action: "Standard day. Check UV index.", condition: "Clear/Cloudy Sky", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: null as number[] | null, action: "Enjoy the day.", condition: "Comfortable Day", iconKey: "sunny" },
];

// AQI action rules  
const AQI_ACTIONS = [
    { max: 12, status: 'GOOD', action: 'Enjoy the fresh air', iconKey: 'smile', color: '#ffc800' },
    { max: 35.4, status: 'MODERATE', action: 'Limit long outdoor exposure', iconKey: 'breeze', color: '#ffc800' },
    { max: 55.4, status: 'UNHEALTHY (SG)', action: 'Mask up if sensitive', iconKey: 'mask', color: '#ffc800' },
    { max: 150.4, status: 'UNHEALTHY', action: 'Wear mask outdoors', iconKey: 'mask', color: '#ffc800' },
    { max: 250.4, status: 'VERY UNHEALTHY', action: 'Stay indoors when possible', iconKey: 'home', color: '#ffc800' },
    { max: Infinity, status: 'HAZARDOUS', action: 'Avoid outdoor activity', iconKey: 'mask', color: '#ffc800' },
];

// Pick weather action based on conditions
function pickWeatherAction(temp: number, humidity: number, weatherId: number) {
    return WEATHER_ACTIONS.find(rule => {
        if (typeof (rule as any).tempMin === 'number' && temp < (rule as any).tempMin) return false;
        if (typeof (rule as any).tempMax === 'number' && temp > (rule as any).tempMax) return false;
        if (typeof (rule as any).humidityMin === 'number' && humidity < (rule as any).humidityMin) return false;
        if (typeof (rule as any).humidityMax === 'number' && humidity > (rule as any).humidityMax) return false;
        if (Array.isArray(rule.weatherCodes) && !rule.weatherCodes.includes(weatherId)) return false;
        return true;
    }) ?? WEATHER_ACTIONS[WEATHER_ACTIONS.length - 1];
}

// Pick AQI action based on PM2.5 value
function pickAQIAction(pm25: number) {
    return AQI_ACTIONS.find(rule => pm25 <= rule.max) ?? AQI_ACTIONS[AQI_ACTIONS.length - 1];
}

// Get AQI action adjusted for weather
function getAqiActionForWeather(aqiAction: typeof AQI_ACTIONS[0], temp: number) {
    if (temp >= 30 && aqiAction.max <= 100) {
        return { ...aqiAction, action: 'Drink water', iconKey: 'water' };
    }
    return aqiAction;
}

// Extract first 2 words from action text
function getTwoWords(text: string): string {
    const words = text.trim().split(/\s+/);
    return words.slice(0, 2).join(' ').toUpperCase();
}

// AQI action icons (SVG)
const AQI_ACTION_ICONS: Record<string, string> = {
    mask: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M44 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M70 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><rect x="32" y="56" width="56" height="26" rx="8" fill="#fff" stroke="#000" stroke-width="6"/><path d="M32 66c-6 0-12-4-12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M88 66c6 0 12-4 12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><rect x="42" y="62" width="36" height="10" rx="4" fill="#000"/><path d="M42 72c8 6 20 6 28 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    home: `<svg viewBox="0 0 110 110"><path d="M15 60 55 25 95 60v30H15Z" fill="#000"/><rect x="40" y="62" width="30" height="28" rx="4" fill="#ffc800"/><rect x="53" y="68" width="10" height="22" fill="#000"/></svg>`,
    breeze: `<svg viewBox="0 0 110 110"><path d="M20 46h52a10 10 0 1 0-10-10" stroke="#000" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M20 70h58a10 10 0 1 1-10 10" stroke="#ffc800" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
    smile: `<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="40" fill="#ffc800" stroke="#000" stroke-width="6"/><circle cx="40" cy="45" r="6" fill="#000"/><circle cx="70" cy="45" r="6" fill="#000"/><path d="M38 68c10 10 24 10 34 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    water: `<svg viewBox="0 0 110 110"><path d="M55 10c0 0-35 40-35 60c0 20 15 35 35 35s35-15 35-35c0-20-35-60-35-60z" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M40 70c5-5 15-5 20 0" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="55" cy="85" rx="20" ry="8" fill="#000" opacity="0.2"/></svg>`,
};

// Format time
function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
}

// Generate HTML from data (matches the / page design)
function generateHTML(data: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    description: string;
    pm25: number;
    aqiInfo: { status: string; color: string };
    date: string;
    time: string;
    weatherId?: number;
    weatherIcon?: string;
}): string {
    // Pick weather and AQI actions
    const weatherAction = pickWeatherAction(data.temp, data.humidity, data.weatherId || 800);
    const baseAqiAction = pickAQIAction(data.pm25);
    const aqiAction = getAqiActionForWeather(baseAqiAction, data.temp);
    
    // Calculate AQI gauge arc
    const maxPM25 = 360;
    const normalizedValue = Math.min(data.pm25 / maxPM25, 1);
    const radius = 94;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * normalizedValue;

    // Get the weather icon URL or use default
    const weatherIconCode = data.weatherIcon || '01d';
    const weatherIconUrl = `https://openweathermap.org/img/wn/${weatherIconCode}@2x.png`;
    
    // Get the AQI action icon SVG
    const aqiActionIcon = AQI_ACTION_ICONS[aqiAction.iconKey] ?? AQI_ACTION_ICONS.mask;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Paper Weather Dashboard</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
        :root {
            --yellow: #ffc800;
            --black: #000000;
            --gray: #ffffff;
            --border: #000000;
            --card: #ffffff;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--gray);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: #000;
        }
        .container {
            width: 800px;
            height: 480px;
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        header.header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--black);
            color: #fff;
            padding: 8px 16px;
            height: 54px;
            gap: 16px;
            flex-wrap: wrap;
        }
        .logo {
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 16px;
        }
        .logo span { color: var(--yellow); }
        .header-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 14px;
            flex-wrap: wrap;
        }
        main.main {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: 200px 1fr 1fr;
            grid-template-areas:
                "hero hero hero gauge"
                "stat1 stat2 stat3 aqiact"
                "action action action .";
            gap: 12px;
            padding: 12px 16px;
            min-height: 0;
        }
        .card {
            background: var(--card);
            border: 2px solid #000;
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .hero { grid-area: hero; }
        .weather-action { grid-area: action; display: none; }
        .aqi-gauge { grid-area: gauge; }
        .stat-humidity { grid-area: stat1; }
        .stat-feels { grid-area: stat2; }
        .stat-wind { grid-area: stat3; }
        .aqi-action { grid-area: aqiact; }
        .hero {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 14px;
            align-items: center;
        }
        .hero-icon {
            width: 108px;
            height: 108px;
            border-radius: 22px;
            background: var(--yellow);
            display: grid;
            place-items: center;
            border: 5px solid #000;
        }
        .hero-icon img { width: 80px; height: 80px; object-fit: contain; }
        .hero-text .condition { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
        .hero-text .temperature { font-size: 60px; font-weight: 800; line-height: 1; }
        .hero-text .hero-action { font-size: 18px; font-weight: 700; color: var(--yellow); margin-top: 6px; }
        .stat-card {
            background: #000;
            border-radius: 12px;
            padding: 8px 10px;
            color: #fff;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px;
            align-items: center;
            height: 100%;
        }
        .stat-card svg { width: 30px; height: 30px; }
        .stat-label { color: var(--yellow); font-size: 13px; font-weight: 700; }
        .stat-value { font-size: 20px; font-weight: 800; }
        .aqi-gauge { display: grid; place-items: center; padding: 0; }
        .aqi-gauge svg { width: 100%; height: 100%; }
        .aqi-action { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; }
        .aqi-icon { width: 80px; height: 80px; display: grid; place-items: center; }
        .aqi-icon svg { width: 80px; height: 80px; }
        .aqi-action-text { font-size: 20px; font-weight: 800; line-height: 1.2; }
        footer.footer {
            background: #ffffff;
            border-top: 1px solid var(--border);
            padding: 6px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #000000;
            min-height: 70px;
            gap: 12px;
            flex-wrap: wrap;
        }
        .quote { max-width: 65%; line-height: 1.2; }
        .font-strong { font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .font-body { font-weight: 700; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo"><span>Weather & AQI</span></div>
            <div class="header-meta">
                <span>${data.date}</span>
                <span>|</span>
                <span>HANOI, VN</span>
            </div>
        </header>

        <main class="main">
            <div class="hero card">
                <div class="hero-icon">
                    <img src="${weatherIconUrl}" alt="Weather icon">
                </div>
                <div class="hero-text">
                    <div class="condition">${weatherAction?.condition?.toUpperCase() || data.description}</div>
                    <div class="temperature">${data.temp}°C</div>
                    <div class="hero-action">${getTwoWords(weatherAction?.action || 'ENJOY THE DAY!')}</div>
                </div>
            </div>

            <div class="aqi-gauge card">
                <svg viewBox="-120 -120 240 240" aria-labelledby="aqi-title">
                    <title id="aqi-title">Air Quality Gauge</title>
                    <circle cx="0" cy="0" r="94" stroke="#000" stroke-width="26" fill="none"/>
                    <circle cx="0" cy="0" r="94" stroke="${baseAqiAction.color}" stroke-width="26" fill="none" stroke-linecap="round" stroke-dasharray="${arcLength} ${circumference}" transform="rotate(-90)"/>
                    <circle cx="0" cy="0" r="78" fill="#000"/>
                    <text x="0" y="-25" text-anchor="middle" fill="#fff" font-size="14" font-weight="700" font-family="Poppins, sans-serif">AQI</text>
                    <text x="0" y="13" text-anchor="middle" fill="${baseAqiAction.color}" font-size="44" font-weight="800" font-family="Poppins, sans-serif">${data.pm25}</text>
                    <text x="0" y="33" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="Poppins, sans-serif">${baseAqiAction.status}</text>
                </svg>
            </div>

            <div class="stat-card stat-humidity">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2S5 11 5 15a7 7 0 0 0 14 0C19 11 12 2 12 2Z" fill="var(--yellow)" stroke="#000" stroke-width="1"/></svg>
                <div class="stat-text">
                    <div class="stat-label">Humidity</div>
                    <div class="stat-value">${data.humidity}%</div>
                </div>
            </div>
            <div class="stat-card stat-feels">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 5a2 2 0 1 0-4 0v7.5a4 4 0 1 0 4 0Z" stroke="var(--yellow)" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="16" r="2.5" fill="var(--yellow)"/>
                    <line x1="12" y1="5" x2="12" y2="10" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div class="stat-text">
                    <div class="stat-label">Feels Like</div>
                    <div class="stat-value">${data.feelsLike}°C</div>
                </div>
            </div>
            <div class="stat-card stat-wind">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9h11a3 3 0 1 0-3-3" stroke="var(--yellow)" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <path d="M4 15h13a2 2 0 1 1-2 2" stroke="var(--yellow)" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
                <div class="stat-text">
                    <div class="stat-label">Wind</div>
                    <div class="stat-value">${data.windSpeed} km/h</div>
                </div>
            </div>

            <div class="aqi-action card">
                <div class="aqi-icon">${aqiActionIcon}</div>
                <div class="aqi-action-text">${getTwoWords(aqiAction.action)}</div>
            </div>
        </main>

        <footer class="footer">
            <div class="quote">"I don't wish for an easy life, I wish to have strength to conquer challenges"</div>
            <div class="updated">Update at: ${data.time}</div>
        </footer>
    </div>
</body>
</html>
    `.trim();
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
        const weatherId = weather.weather?.[0]?.id || 800;
        const weatherIcon = weather.weather?.[0]?.icon || '01d';
        const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
        const aqiInfo = getAqiStatus(pm25);

        const data = {
            temp,
            feelsLike,
            humidity,
            windSpeed,
            description,
            weatherId,
            weatherIcon,
            pm25,
            aqiInfo,
            date: formatDate(now),
            time: formatTime(now),
        };

        console.log('[image] Generating HTML...');
        let html = generateHTML(data);

        console.log('[image] Converting HTML to PNG...');
        
        // Configure Chromium for Vercel serverless
        const isVercel = process.env.VERCEL === '1';
        const chromiumArgs = isVercel
            ? chromium.args
            : [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage',
                  '--disable-accelerated-2d-canvas',
                  '--no-first-run',
                  '--no-zygote',
                  '--single-process',
                  '--disable-gpu',
              ];
        
        const executablePath = isVercel ? await chromium.executablePath() : undefined;
        
        // Ensure HTML body/html are exactly 800x480
        // Add inline style to body to enforce exact dimensions
        html = html.replace(
            /<body[^>]*>/,
            '<body style="width: 800px; height: 480px; margin: 0; padding: 0; overflow: hidden;">'
        );
        
        // Convert HTML to PNG using node-html-to-image
        // Set exact dimensions: 800x480 via viewport
        const imageBuffer = await nodeHtmlToImage({
            html: html,
            type: 'png',
            quality: 100,
            puppeteerArgs: {
                args: chromiumArgs,
                ...(executablePath && { executablePath }),
                defaultViewport: {
                    width: 800,
                    height: 480,
                },
            },
            waitUntil: 'networkidle0',
        }) as Buffer;

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
