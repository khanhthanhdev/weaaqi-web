import nodeHtmlToImage from 'node-html-to-image';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

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

// Configuration
export const CONFIG = {
    refreshInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
};

// Helper function to find system Chrome/Chromium for local development
function findSystemChrome(): string | undefined {
    // First, check CHROME_PATH environment variable
    if (process.env.CHROME_PATH) {
        if (existsSync(process.env.CHROME_PATH)) {
            return process.env.CHROME_PATH;
        }
        console.warn(`[generate-static] CHROME_PATH set to "${process.env.CHROME_PATH}" but file doesn't exist`);
    }
    
    const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // WSL paths (Windows Chrome accessible from WSL)
        '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
        '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    ];
    
    for (const path of possiblePaths) {
        if (existsSync(path)) {
            return path;
        }
    }
    
    // Try to find via which/where command
    try {
        const command = process.platform === 'win32' ? 'where chrome' : 'which google-chrome google-chrome-stable chromium chromium-browser 2>/dev/null';
        const result = execSync(command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (result) {
            const paths = result.split('\n').filter(p => p.trim());
            for (const path of paths) {
                if (existsSync(path.trim())) {
                    return path.trim();
                }
            }
        }
    } catch (e) {
        // Command failed, Chrome not in PATH
    }
    
    return undefined;
}

// Export the generate function for use by server.ts
export async function generate() {
    try {
        // Try to get API key from environment variable (Bun auto-loads .env files)
        let apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
        
        // Fallback: try to load from env-config.js if it exists (for development)
        if (!apiKey) {
            try {
                const envConfig = await import('../env-config.js');
                apiKey = envConfig.OPENWEATHER_API_KEY || envConfig.default;
            } catch (e) {
                // env-config.js doesn't exist or failed to load
            }
        }
        
        if (!apiKey) {
            console.error('\n❌ Error: OPENWEATHER_API_KEY not found');
            console.error('\nTo fix this, create a .env file in the project root with:');
            console.error('  OPENWEATHER_API_KEY=your_api_key_here');
            console.error('\nOr export it in your shell:');
            console.error('  export OPENWEATHER_API_KEY=your_api_key_here\n');
            throw new Error('OPENWEATHER_API_KEY environment variable is not set');
        }

        console.log('[generate-static] Fetching weather and AQI data...');
        
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

        console.log('[generate-static] Generating HTML...');
        const html = generateHTML(data);

        // Create dist directory if it doesn't exist
        const distDir = join(process.cwd(), 'dist');
        if (!existsSync(distDir)) {
            await mkdir(distDir, { recursive: true });
        }
        
        // Save HTML for reference
        const htmlPath = join(distDir, 'image.html');
        await writeFile(htmlPath, html, 'utf-8');
        console.log(`[generate-static] HTML saved to ${htmlPath}`);

        console.log('[generate-static] Converting HTML to PNG...');
        
        // Convert HTML to PNG using node-html-to-image
        // For local development, use default puppeteer
        const imageBuffer = await nodeHtmlToImage({
            html: html,
            type: 'png',
            quality: 100,
            puppeteerArgs: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            },
            waitUntil: 'networkidle0',
        }) as Buffer;

        // Save the image
        const imagePath = join(distDir, 'image.png');
        // Convert to Uint8Array for Bun.write
        const buffer = typeof imageBuffer === 'string' 
            ? new Uint8Array(Buffer.from(imageBuffer, 'base64'))
            : new Uint8Array(imageBuffer);
        await Bun.write(imagePath, buffer);
        console.log(`[generate-static] Image saved to ${imagePath}`);
        
        // Also save data as JSON for reference
        const dataPath = join(distDir, 'image-data.json');
        await writeFile(dataPath, JSON.stringify({ ...data, generatedAt: now.toISOString() }), 'utf-8');
        console.log(`[generate-static] Data saved to ${dataPath}`);
        
        console.log('[generate-static] ✓ Image generation completed successfully');
        
    } catch (error) {
        console.error('[generate-static] Error:', error);
        // Only exit if called directly (not when imported as module)
        if (import.meta.main) {
            process.exit(1);
        }
        throw error; // Re-throw for module usage
    }
}

// Run if called directly
if (import.meta.main) {
    generate();
}
