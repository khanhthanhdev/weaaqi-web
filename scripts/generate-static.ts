#!/usr/bin/env bun
/**
 * Static Site Generator for Weather & AQI Dashboard
 * Fetches data from OpenWeather API and generates pre-rendered HTML files
 * Runs every 15 minutes automatically
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configuration
const CONFIG = {
    lat: 21.0285,
    lon: 105.8542,
    locationLabel: 'HANOI, VN',
    quote: "I don't wish for an easy life, I wish to have strength to conquer challenges",
    refreshInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
    outputDir: './dist',
    templateFile: './templates/index.template.html',
};

// Weather action rules
const WEATHER_ACTIONS = [
    { tempMax: 5, humidityMin: 0, weatherCodes: [511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], action: "Stay warm, have warm tea. Extreme cold.", condition: "Severe Winter Weather", iconKey: "cold" },
    { tempMax: 5, humidityMin: 0, weatherCodes: [800, 801, 802, 803, 804], action: "Stay warm, have warm tea.", condition: "Freezing Cold", iconKey: "cold" },
    { tempMax: 10, humidityMin: 0, weatherCodes: null, action: "Warm tea recommended. Stay cozy.", condition: "Cold", iconKey: "tea" },
    { tempMax: 15, humidityMin: 70, weatherCodes: null, action: "Wear warm layers. Stay dry.", condition: "Chilly & Damp", iconKey: "warm" },
    { tempMin: 35, humidityMin: 50, weatherCodes: null, action: "Wear sunglasses, stay hydrated.", condition: "Very Hot", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 75, weatherCodes: null, action: "Wear sunglasses, drink water often.", condition: "Extreme Humidity/Muggy", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 50, weatherCodes: null, action: "Wear sunglasses, drink water.", condition: "Very Hot & Humid", iconKey: "sunglasses" },
    { tempMin: 30, humidityMax: 40, weatherCodes: null, action: "Wear sunglasses, hydrate constantly.", condition: "Hot & Dry", iconKey: "sunglasses" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232], action: "Bring umbrella. Severe T-Storm.", condition: "Thunderstorm", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [502, 503, 504, 522], action: "Bring umbrella. Heavy rain.", condition: "Heavy Rain", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [300, 301, 302, 310, 311, 312, 313, 314, 321, 500, 501, 520, 521, 531], action: "Bring umbrella.", condition: "Rain/Drizzle", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [701, 711, 721, 741], action: "Low visibility, wear mask if smoky.", condition: "Mist/Fog/Haze", iconKey: "haze" },
    { tempMin: 25, tempMax: 35, humidityMax: 40, weatherCodes: [800, 801], action: "Wear sunglasses. Great day!", condition: "Sunny", iconKey: "sunglasses" },
    { tempMin: 15, tempMax: 30, humidityMax: 40, weatherCodes: null, action: "Enjoy outdoors, stay hydrated.", condition: "Pleasant & Dry", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 70, weatherCodes: null, action: "Comfortable day. Light walk.", condition: "Warm & Humid", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 41, humidityMax: 69, weatherCodes: null, action: "Perfect weather! Enjoy!", condition: "Ideal Comfort", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [800, 801, 802, 803, 804], action: "Standard day. Check UV index.", condition: "Clear/Cloudy Sky", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: null, action: "Enjoy the day.", condition: "Comfortable Day", iconKey: "sunny" },
];

const AQI_ACTIONS = [
    { max: 12, status: 'GOOD', action: 'Enjoy the fresh air', iconKey: 'smile', color: '#ffc800' },
    { max: 35.4, status: 'MODERATE', action: 'Limit long outdoor exposure', iconKey: 'breeze', color: '#ffc800' },
    { max: 55.4, status: 'UNHEALTHY (SG)', action: 'Mask up if sensitive', iconKey: 'mask', color: '#ffc800' },
    { max: 150.4, status: 'UNHEALTHY', action: 'Wear mask outdoors', iconKey: 'mask', color: '#ffc800' },
    { max: 250.4, status: 'VERY UNHEALTHY', action: 'Stay indoors when possible', iconKey: 'home', color: '#ffc800' },
    { max: Infinity, status: 'HAZARDOUS', action: 'Avoid outdoor activity', iconKey: 'mask', color: '#ffc800' },
];

// SVG Icons
const AQI_ACTION_ICONS: Record<string, string> = {
    mask: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M44 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M70 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><rect x="32" y="56" width="56" height="26" rx="8" fill="#fff" stroke="#000" stroke-width="6"/><path d="M32 66c-6 0-12-4-12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M88 66c6 0 12-4 12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><rect x="42" y="62" width="36" height="10" rx="4" fill="#000"/><path d="M42 72c8 6 20 6 28 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    home: `<svg viewBox="0 0 110 110"><path d="M15 60 55 25 95 60v30H15Z" fill="#000"/><rect x="40" y="62" width="30" height="28" rx="4" fill="#ffc800"/><rect x="53" y="68" width="10" height="22" fill="#000"/></svg>`,
    breeze: `<svg viewBox="0 0 110 110"><path d="M20 46h52a10 10 0 1 0-10-10" stroke="#000" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M20 70h58a10 10 0 1 1-10 10" stroke="#ffc800" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
    smile: `<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="40" fill="#ffc800" stroke="#000" stroke-width="6"/><circle cx="40" cy="45" r="6" fill="#000"/><circle cx="70" cy="45" r="6" fill="#000"/><path d="M38 68c10 10 24 10 34 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    water: `<svg viewBox="0 0 110 110"><path d="M55 10c0 0-35 40-35 60c0 20 15 35 35 35s35-15 35-35c0-20-35-60-35-60z" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M40 70c5-5 15-5 20 0" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="55" cy="85" rx="20" ry="8" fill="#000" opacity="0.2"/></svg>`,
};

interface WeatherData {
    weather: Array<{ id: number; description: string; icon: string }>;
    main: { temp: number; feels_like: number; humidity: number };
    wind: { speed: number };
}

interface AQIData {
    list: Array<{ components: { pm2_5: number } }>;
}

interface GeneratedData {
    weather: WeatherData;
    aqi: AQIData;
    generatedAt: string;
}

// Load API key from environment or .env file
async function loadApiKey(): Promise<string> {
    // First try environment variable
    if (process.env.WEATHER_API_KEY) {
        return process.env.WEATHER_API_KEY;
    }

    // Try loading from .env file
    try {
        const envPath = join(process.cwd(), '.env');
        const envContent = await readFile(envPath, 'utf8');
        const match = envContent.match(/WEATHER_API_KEY=(.+)/);
        if (match) {
            return match[1].trim();
        }
    } catch (error) {
        // .env file doesn't exist
    }

    // Try loading from env-config.js
    try {
        const envConfigPath = join(process.cwd(), 'env-config.js');
        const envConfigContent = await readFile(envConfigPath, 'utf8');
        const match = envConfigContent.match(/OPENWEATHER_API_KEY\s*=\s*["'](.+?)["']/);
        if (match) {
            return match[1];
        }
    } catch (error) {
        // env-config.js doesn't exist
    }

    throw new Error('No API key found. Set WEATHER_API_KEY environment variable or create a .env file.');
}

// Fetch weather data from OpenWeather API
async function fetchWeatherData(apiKey: string): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${CONFIG.lat}&lon=${CONFIG.lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Fetch AQI data from OpenWeather API
async function fetchAQIData(apiKey: string): Promise<AQIData> {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${CONFIG.lat}&lon=${CONFIG.lon}&appid=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`AQI API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Pick weather action based on conditions
function pickWeatherAction(temp: number, humidity: number, weatherId: number) {
    return WEATHER_ACTIONS.find(rule => {
        if (typeof rule.tempMin === 'number' && temp < rule.tempMin) return false;
        if (typeof rule.tempMax === 'number' && temp > rule.tempMax) return false;
        if (typeof rule.humidityMin === 'number' && humidity < rule.humidityMin) return false;
        if (typeof rule.humidityMax === 'number' && humidity > rule.humidityMax) return false;
        if (Array.isArray(rule.weatherCodes) && !rule.weatherCodes.includes(weatherId)) return false;
        return true;
    }) ?? WEATHER_ACTIONS[WEATHER_ACTIONS.length - 1];
}

// Pick AQI action based on PM2.5 level
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

// Format time as HH:MM
function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format date as "MMM DD, YYYY"
function formatDate(date: Date): string {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Convert m/s to km/h
function kmhFromMs(speedMs: number): number {
    return Math.round(speedMs * 3.6);
}

// Calculate AQI gauge arc
function calculateAqiArc(pm25: number): { arcLength: number; circumference: number } {
    const maxPM25 = 360;
    const normalizedValue = Math.min(pm25 / maxPM25, 1);
    const radius = 94;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * normalizedValue;
    return { arcLength, circumference };
}

// Generate static HTML with pre-rendered data
async function generateStaticHTML(weather: WeatherData, aqi: AQIData): Promise<string> {
    const now = new Date();
    
    // Extract data
    const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
    const temp = Math.round(weather.main?.temp || 0);
    const feelsLike = Math.round(weather.main?.feels_like || temp);
    const humidity = weather.main?.humidity || 0;
    const windSpeed = kmhFromMs(weather.wind?.speed || 0);
    const weatherId = weather.weather?.[0]?.id || 800;
    const weatherIcon = weather.weather?.[0]?.icon || '01d';
    const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);

    // Get actions
    const weatherAction = pickWeatherAction(temp, humidity, weatherId);
    const baseAqiAction = pickAQIAction(pm25);
    const aqiAction = getAqiActionForWeather(baseAqiAction, temp);

    // Calculate AQI gauge
    const { arcLength, circumference } = calculateAqiArc(pm25);

    // Format date and time
    const dateStr = formatDate(now);
    const timeStr = formatTime(now);

    // Read template
    let template: string;
    try {
        template = await readFile(CONFIG.templateFile, 'utf8');
    } catch {
        // Fall back to reading index.html and creating template
        template = await readFile('./index.html', 'utf8');
    }

    // Replace placeholders in template
    const replacements: Record<string, string> = {
        '{{DATE}}': dateStr,
        '{{LOCATION}}': CONFIG.locationLabel,
        '{{CONDITION}}': weatherAction?.condition?.toUpperCase() || description,
        '{{TEMPERATURE}}': `${temp}°C`,
        '{{HERO_ACTION}}': weatherAction?.action?.toUpperCase() || '',
        '{{WEATHER_ICON}}': `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`,
        '{{HUMIDITY}}': `${humidity}%`,
        '{{FEELS_LIKE}}': `${feelsLike}°C`,
        '{{WIND_SPEED}}': `${windSpeed} km/h`,
        '{{AQI_VALUE}}': String(pm25),
        '{{AQI_STATUS}}': baseAqiAction.status,
        '{{AQI_ACTION}}': aqiAction.action.toUpperCase(),
        '{{AQI_ICON}}': AQI_ACTION_ICONS[aqiAction.iconKey] ?? AQI_ACTION_ICONS.mask,
        '{{AQI_COLOR}}': baseAqiAction.color || '#ffc800',
        '{{AQI_ARC_LENGTH}}': String(arcLength),
        '{{AQI_CIRCUMFERENCE}}': String(circumference),
        '{{QUOTE}}': CONFIG.quote,
        '{{LAST_UPDATED}}': timeStr,
    };

    let html = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replaceAll(placeholder, value);
    }

    return html;
}

// Ensure output directory exists
async function ensureOutputDir(): Promise<void> {
    if (!existsSync(CONFIG.outputDir)) {
        await mkdir(CONFIG.outputDir, { recursive: true });
    }
}

async function copyDirectory(source: string, destination: string): Promise<void> {
    await mkdir(destination, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(source, entry.name);
        const destPath = join(destination, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

async function copyStaticAssets(): Promise<void> {
    const assets = [
        { from: './figma-to-html/css', to: join(CONFIG.outputDir, 'css') },
        { from: './figma-to-html/images', to: join(CONFIG.outputDir, 'images') },
    ];

    for (const asset of assets) {
        if (!existsSync(asset.from)) {
            continue;
        }

        await copyDirectory(asset.from, asset.to);
    }
}

// Main generation function
async function generate(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Starting static site generation...`);

    try {
        const apiKey = await loadApiKey();
        console.log('✓ API key loaded');

        const [weather, aqi] = await Promise.all([
            fetchWeatherData(apiKey),
            fetchAQIData(apiKey),
        ]);
        console.log('✓ Weather and AQI data fetched');

        const html = await generateStaticHTML(weather, aqi);
        console.log('✓ HTML generated');

        await ensureOutputDir();
        
        // Write the generated HTML
        const outputPath = join(CONFIG.outputDir, 'index.html');
        await writeFile(outputPath, html, 'utf8');
        console.log(`✓ Written to ${outputPath}`);

        await copyStaticAssets();
        console.log('✓ Static assets copied');

        // Also save the raw data for debugging/API endpoints
        const dataPath = join(CONFIG.outputDir, 'data.json');
        const data: GeneratedData = {
            weather,
            aqi,
            generatedAt: new Date().toISOString(),
        };
        await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✓ Data written to ${dataPath}`);

        console.log(`[${new Date().toISOString()}] Generation complete!\n`);
    } catch (error) {
        console.error('✗ Generation failed:', error);
        throw error;
    }
}

// Run with auto-refresh if --watch flag is passed
async function main(): Promise<void> {
    const isWatch = process.argv.includes('--watch');

    await generate();

    if (isWatch) {
        console.log(`🔄 Watching mode enabled. Regenerating every ${CONFIG.refreshInterval / 60000} minutes...\n`);
        
        setInterval(async () => {
            try {
                await generate();
            } catch (error) {
                console.error('Generation failed, will retry on next interval:', error);
            }
        }, CONFIG.refreshInterval);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

export { generate, CONFIG };
