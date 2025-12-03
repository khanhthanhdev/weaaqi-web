import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodeHtmlToImage from 'node-html-to-image';
import chromium from '@sparticuz/chromium-min';

// Fetch weather data
async function fetchWeatherData(apiKey: string) {
    const lat = 21.0285;
    const lon = 105.8542;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
        throw new Error('Failed to fetch weather data: Unknown error');
    }
}

// Fetch AQI data
async function fetchAQIData(apiKey: string) {
    const lat = 21.0285;
    const lon = 105.8542;
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`AQI API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch AQI data: ${error.message}`);
        }
        throw new Error('Failed to fetch AQI data: Unknown error');
    }
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

// Generate HTML from data
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
}): string {
    // Get action text based on AQI status
    const getActionText = (status: string) => {
        if (status.includes('GOOD') || status.includes('MODERATE')) return 'PERFECT WEATHER';
        return 'WEAR MASK';
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css?family=Inter&display=swap');
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-size: 14px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f0f0f0;
        }
        
        .v36_37 {
            width: 800px;
            height: 480px;
            background: rgba(255,255,255,1);
            background-repeat: no-repeat;
            background-position: center center;
            background-size: cover;
            opacity: 1;
            position: relative;
            top: 0px;
            left: 0px;
            overflow: hidden;
        }
        
        .v13_6026 {
            width: 800px;
            height: 480px;
            background: rgba(255,255,255,1);
            opacity: 1;
            position: relative;
            top: 0px;
            left: 0px;
            overflow: hidden;
        }
        
        .v13_6031 {
            width: 391px;
            color: rgba(255,255,0,1);
            position: absolute;
            top: 13px;
            left: 189px;
            font-family: Inter;
            font-weight: 900;
            font-size: 24px;
            opacity: 1;
            text-align: left;
        }
        
        .v78_12 {
            width: 251px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 435px;
            left: 14px;
            font-family: Inter;
            font-weight: 900;
            font-size: 24px;
            opacity: 1;
            text-align: left;
        }
        
        .v14_6033 {
            width: 134px;
            height: 66px;
            background: rgba(0,0,0,1);
            opacity: 1;
            position: absolute;
            top: 331px;
            left: 37px;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 10px;
            border-bottom-right-radius: 10px;
            overflow: hidden;
        }
        
        .v25_2 {
            width: 151px;
            height: 66px;
            background: rgba(0,0,0,1);
            opacity: 1;
            position: absolute;
            top: 331px;
            left: 189px;
        }
        
        .v25_3 {
            width: 123px;
            height: 66px;
            background: rgba(0,0,0,1);
            opacity: 1;
            position: absolute;
            top: 331px;
            left: 350px;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 10px;
            border-bottom-right-radius: 10px;
            overflow: hidden;
        }
        
        .v25_5 {
            width: 76px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 339px;
            left: 88px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 15px;
            opacity: 1;
            text-align: left;
        }
        
        .v25_24 {
            width: 67px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 358px;
            left: 88px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 24px;
            opacity: 1;
            text-align: left;
        }
        
        .v26_26 {
            width: 30px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 358px;
            left: 403px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 24px;
            opacity: 1;
            text-align: left;
        }
        
        .v25_25 {
            width: 69px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 358px;
            left: 257px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 24px;
            opacity: 1;
            text-align: left;
        }
        
        .v25_6 {
            width: 76px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 339px;
            left: 257px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 15px;
            opacity: 1;
            text-align: left;
        }
        
        .v36_35 {
            width: 120px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 18px;
            left: 667px;
            font-family: Inter;
            font-weight: 500;
            font-size: 15px;
            opacity: 1;
            text-align: left;
        }
        
        .v26_31 {
            width: 448px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 234px;
            left: 45px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 36px;
            opacity: 1;
            text-align: center;
        }
        
        .v36_32 {
            width: 123px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 304px;
            left: 660px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 40px;
            opacity: 1;
            text-align: left;
        }
        
        .v25_7 {
            width: 40px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 339px;
            left: 402px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 15px;
            opacity: 1;
            text-align: left;
        }
        
        .v26_27 {
            width: 32px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 372px;
            left: 433px;
            font-family: Inter;
            font-weight: 500;
            font-size: 13px;
            opacity: 1;
            text-align: left;
        }
        
        .v26_30 {
            width: 448px;
            height: 80px;
            background: rgba(217,217,217,0);
            opacity: 1;
            position: absolute;
            top: 222px;
            left: 37px;
            border: 1px solid rgba(0,0,0,1);
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border-bottom-left-radius: 10px;
            border-bottom-right-radius: 10px;
            overflow: hidden;
        }
        
        .v29_74 {
            width: 281px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 97px;
            left: 233px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 96px;
            opacity: 1;
            text-align: left;
        }
        
        .v30_81 {
            width: 200px;
            height: 200px;
            background: rgba(0,0,0,1);
            opacity: 1;
            position: absolute;
            top: 71px;
            left: 560px;
            border-radius: 50%;
        }
        
        .v30_84 {
            width: 76px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 89px;
            left: 621px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 40px;
            opacity: 1;
            text-align: center;
        }
        
        .v30_86 {
            width: 108px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 213px;
            left: 611px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 16px;
            opacity: 1;
            text-align: center;
        }
        
        .v30_84 {
            width: 76px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 89px;
            left: 621px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 40px;
            opacity: 1;
            text-align: center;
        }
        
        .v30_86 {
            width: 108px;
            color: rgba(255,255,255,1);
            position: absolute;
            top: 213px;
            left: 611px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 16px;
            opacity: 1;
            text-align: center;
        }
        
        .v30_85 {
            width: 140px;
            color: rgba(255,255,0,1);
            position: absolute;
            top: 135px;
            left: 590px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 80px;
            opacity: 1;
            text-align: center;
            line-height: 1;
        }
        
        .v38_39 {
            width: 459px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 434px;
            left: 310px;
            font-family: Inter;
            font-weight: 500;
            font-style: italic;
            font-size: 24px;
            opacity: 1;
            text-align: left;
            white-space: nowrap;
        }
        
        .v29_75 {
            width: 320px;
            color: rgba(0,0,0,1);
            position: absolute;
            top: 58px;
            left: 242px;
            font-family: Inter;
            font-weight: Bold;
            font-size: 32px;
            opacity: 1;
            text-align: left;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <div class="v36_37">
        <div class="v13_6026"></div>
        <span class="v13_6031">${data.date} | HANOI, VIETNAM</span>
        <span class="v78_12">INTRO TO CECS</span>
        <div class="v14_6033"></div>
        <div class="v25_2"></div>
        <div class="v25_3"></div>
        <span class="v25_5">Humidity</span>
        <span class="v25_24">${data.humidity} %</span>
        <span class="v26_26">${data.windSpeed}</span>
        <span class="v25_25">${data.feelsLike}° C</span>
        <span class="v25_6">Feels Like</span>
        <span class="v36_35">Update at: ${data.time}</span>
        <span class="v26_31">${getActionText(data.aqiInfo.status)}</span>
        <span class="v36_32">${data.aqiInfo.status}</span>
        <span class="v25_7">Wind</span>
        <span class="v26_27">km/h</span>
        <div class="v26_30"></div>
        <span class="v29_74">${data.temp}°C</span>
        <div class="v30_81"></div>
        <span class="v30_84">PM2.5</span>
        <span class="v30_85" style="color: ${data.aqiInfo.color}">${data.pm25}</span>
        <span class="v30_86">${data.aqiInfo.status}</span>
        <span class="v38_39">"A quiet sea never made a skilled sailor."</span>
        <span class="v29_75">${data.description}</span>
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

        const now = new Date();
        const temp = Math.round(weather.main?.temp || 0);
        const feelsLike = Math.round(weather.main?.feels_like || temp);
        const humidity = weather.main?.humidity || 0;
        const windSpeed = Math.round((weather.wind?.speed || 0) * 3.6);
        const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
        const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
        const aqiInfo = getAqiStatus(pm25);

        const data = {
            temp,
            feelsLike,
            humidity,
            windSpeed,
            description,
            pm25,
            aqiInfo,
            date: formatDate(now),
            time: formatTime(now),
        };

        console.log('[image] Generating HTML...');
        const html = generateHTML(data);

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
        
        // Convert HTML to PNG using node-html-to-image
        const imageBuffer = await nodeHtmlToImage({
            html: html,
            type: 'png',
            quality: 100,
            puppeteerArgs: {
                args: chromiumArgs,
                ...(executablePath && { executablePath }),
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
