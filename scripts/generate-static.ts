import nodeHtmlToImage from 'node-html-to-image';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
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

// Format time
function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
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

// Weather action icons (SVG)
const WEATHER_ACTION_ICONS: Record<string, string> = {
    umbrella: `<svg viewBox="0 0 120 120"><path d="M12 72c0-34 29-62 64-62s64 28 64 62H12Z" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="round"/><path d="M76 72v44" stroke="#ffc800" stroke-width="10" stroke-linecap="round"/><path d="M76 114c0 10-10 20-22 20" stroke="#000" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="76" cy="72" r="7" fill="#000"/><path d="M50 16c0 8-6 14-14 14s-14-6-14-14C22 6 36-6 36-6s14 12 14 22Z" fill="#000"/><path d="M110 26c0 6-5 11-11 11s-11-5-11-11c0-8 11-18 11-18s11 10 11 18Z" fill="#000"/></svg>`,
    cold: `<svg viewBox="0 0 108 108"><path d="M92.75 68.35c6.96-6.8 11.25-16.3 11.25-26.82C104 20.8 87.2 4 66.5 4c-17.83 0-32.75 12.47-36.54 29.19h-3.04C14.33 33.19 4 43.49 4 56.13c0 7.3 3.42 13.8 8.75 18.02" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M54 61.5v17.73M61.08 54.42L54 61.5l-7.08-7.08M38.67 70.35L54 79.23M36.08 60.67l2.59 9.68-9.67 2.58M38.67 88.07L54 79.23M29 85.48l9.67 2.59-2.59 9.67M54 96.91V79.23M46.92 104L54 96.91l7.08 7.09M69.33 88.07L54 79.23M71.92 97.74l-2.59-9.67 9.67-2.59M69.33 70.35L54 79.23M79 72.93l-9.67-2.58 2.59-9.68" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    heat: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="30" fill="#ffc800" stroke="#000" stroke-width="6"/><g stroke="#000" stroke-width="6" stroke-linecap="round"><line x1="60" y1="12" x2="60" y2="0"/><line x1="60" y1="120" x2="60" y2="108"/><line x1="12" y1="60" x2="0" y2="60"/><line x1="120" y1="60" x2="108" y2="60"/><line x1="20" y1="20" x2="8" y2="8"/><line x1="100" y1="20" x2="112" y2="8"/><line x1="20" y1="100" x2="8" y2="112"/><line x1="100" y1="100" x2="112" y2="112"/></g></svg>`,
    haze: `<svg viewBox="0 0 120 120"><rect x="18" y="30" width="84" height="14" rx="7" fill="#000"/><rect x="10" y="52" width="84" height="14" rx="7" fill="#ffc800"/><rect x="26" y="74" width="80" height="14" rx="7" fill="#000"/><circle cx="86" cy="36" r="8" fill="#ffc800"/></svg>`,
    sunny: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="30" fill="#ffc800" stroke="#000" stroke-width="6"/><g stroke="#000" stroke-width="6" stroke-linecap="round"><line x1="60" y1="14" x2="60" y2="0"/><line x1="60" y1="120" x2="60" y2="106"/><line x1="14" y1="60" x2="0" y2="60"/><line x1="120" y1="60" x2="106" y2="60"/><line x1="20" y1="20" x2="8" y2="8"/><line x1="100" y1="20" x2="112" y2="8"/><line x1="20" y1="100" x2="8" y2="112"/><line x1="100" y1="100" x2="112" y2="112"/></g></svg>`,
    sunglasses: `<svg viewBox="0 0 120 120"><ellipse cx="35" cy="60" rx="25" ry="20" fill="#000" stroke="#000" stroke-width="4"/><ellipse cx="85" cy="60" rx="25" ry="20" fill="#000" stroke="#000" stroke-width="4"/><path d="M60 60c0-8 5-12 10-12" stroke="#000" stroke-width="4" fill="none"/><path d="M60 60c0-8-5-12-10-12" stroke="#000" stroke-width="4" fill="none"/><line x1="10" y1="55" x2="0" y2="50" stroke="#000" stroke-width="4"/><line x1="110" y1="55" x2="120" y2="50" stroke="#000" stroke-width="4"/><ellipse cx="35" cy="60" rx="18" ry="14" fill="#ffc800" opacity="0.3"/><ellipse cx="85" cy="60" rx="18" ry="14" fill="#ffc800" opacity="0.3"/></svg>`,
    tea: `<svg viewBox="0 0 120 120"><path d="M20 50h60v45c0 11-13 20-30 20s-30-9-30-20V50z" fill="#ffc800" stroke="#000" stroke-width="5"/><path d="M80 55h15c8 0 15 7 15 15s-7 15-15 15H80" stroke="#000" stroke-width="5" fill="none"/><path d="M35 35c0-8 5-15 15-15s15 7 15 15" stroke="#000" stroke-width="4" fill="none" opacity="0.6"/><path d="M45 30c0-6 4-12 12-12" stroke="#000" stroke-width="4" fill="none" opacity="0.6"/><ellipse cx="50" cy="50" rx="30" ry="8" fill="#000" opacity="0.2"/></svg>`,
    warm: `<svg viewBox="0 0 120 120"><path d="M60 20v15M45 25l5 12M75 25l-5 12" stroke="#ffc800" stroke-width="4" stroke-linecap="round"/><path d="M35 45h50l8 55H27l8-55z" fill="#ffc800" stroke="#000" stroke-width="5"/><path d="M35 45c0-15 11-25 25-25s25 10 25 25" stroke="#000" stroke-width="5" fill="none"/><rect x="45" y="60" width="30" height="25" rx="3" fill="#000"/><circle cx="60" cy="72" r="6" fill="#ffc800"/></svg>`,
};

// AQI action icons (SVG)
const AQI_ACTION_ICONS: Record<string, string> = {
    mask: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M44 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M70 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><rect x="32" y="56" width="56" height="26" rx="8" fill="#fff" stroke="#000" stroke-width="6"/><path d="M32 66c-6 0-12-4-12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M88 66c6 0 12-4 12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><rect x="42" y="62" width="36" height="10" rx="4" fill="#000"/><path d="M42 72c8 6 20 6 28 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    home: `<svg viewBox="0 0 110 110"><path d="M15 60 55 25 95 60v30H15Z" fill="#000"/><rect x="40" y="62" width="30" height="28" rx="4" fill="#ffc800"/><rect x="53" y="68" width="10" height="22" fill="#000"/></svg>`,
    breeze: `<svg viewBox="0 0 110 110"><path d="M20 46h52a10 10 0 1 0-10-10" stroke="#000" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M20 70h58a10 10 0 1 1-10 10" stroke="#ffc800" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
    smile: `<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="40" fill="#ffc800" stroke="#000" stroke-width="6"/><circle cx="40" cy="45" r="6" fill="#000"/><circle cx="70" cy="45" r="6" fill="#000"/><path d="M38 68c10 10 24 10 34 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    water: `<svg viewBox="0 0 110 110"><path d="M55 10c0 0-35 40-35 60c0 20 15 35 35 35s35-15 35-35c0-20-35-60-35-60z" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M40 70c5-5 15-5 20 0" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="55" cy="85" rx="20" ry="8" fill="#000" opacity="0.2"/></svg>`,
};

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
                    <div class="hero-action">${weatherAction?.action?.toUpperCase() || 'ENJOY THE DAY!'}</div>
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
                <div class="aqi-action-text">${aqiAction.action.toUpperCase()}</div>
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

// Configuration
export const CONFIG = {
    refreshInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
};

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
        const weatherId = weather.weather?.[0]?.id || 800;
        const weatherIcon = weather.weather?.[0]?.icon || '01d';
        const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
        const aqiInfo = getAqiStatus(pm25);

        // Get weather and AQI actions
        const weatherAction = pickWeatherAction(temp, humidity, weatherId);
        const baseAqiAction = pickAQIAction(pm25);
        const aqiAction = getAqiActionForWeather(baseAqiAction, temp);

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
            weatherAction: getTwoWords(weatherAction?.action || 'ENJOY THE DAY'),
            condition: weatherAction?.condition?.toUpperCase() || description,
            aqiAction: getTwoWords(aqiAction.action),
        };

        // Create dist directory if it doesn't exist
        const distDir = join(process.cwd(), 'dist');
        if (!existsSync(distDir)) {
            await mkdir(distDir, { recursive: true });
        }

        // Read dist/index.html template
        const indexHtmlPath = join(distDir, 'index.html');
        if (!existsSync(indexHtmlPath)) {
            throw new Error('dist/index.html not found. Please build the project first.');
        }

        console.log('[generate-static] Reading dist/index.html...');
        let html = await readFile(indexHtmlPath, 'utf-8');

        // Update HTML with fresh data by replacing text content in specific spans
        console.log('[generate-static] Updating HTML with fresh data...');
        
        // Date and location: <span class="v13_6031">NOV 30, 2025 | HANOI, VIETNAM</span>
        html = html.replace(
            /(<span class="v13_6031">)[^<]*(<\/span>)/,
            `$1${data.date} | HANOI, VIETNAM$2`
        );
        
        // Humidity: <span class="v25_24">61 %</span>
        html = html.replace(
            /(<span class="v25_24">)[^<]*(<\/span>)/,
            `$1${data.humidity} %$2`
        );
        
        // Wind speed: <span class="v26_26">7</span>
        html = html.replace(
            /(<span class="v26_26">)[^<]*(<\/span>)/,
            `$1${data.windSpeed}$2`
        );
        
        // Feels like: <span class="v25_25">21° C</span>
        html = html.replace(
            /(<span class="v25_25">)[^<]*(<\/span>)/,
            `$1${data.feelsLike}° C$2`
        );
        
        // Update time: <span class="v36_35">Update at: 18:49</span>
        html = html.replace(
            /(<span class="v36_35">)[^<]*(<\/span>)/,
            `$1Update at: ${data.time}$2`
        );
        
        // Weather action: <span class="v26_31">PERFECT WEATHER</span>
        html = html.replace(
            /(<span class="v26_31">)[^<]*(<\/span>)/,
            `$1${data.weatherAction}$2`
        );
        
        // AQI action/status: <span class="v36_32">WEAR MASK</span>
        html = html.replace(
            /(<span class="v36_32">)[^<]*(<\/span>)/,
            `$1${data.aqiAction}$2`
        );
        
        // Temperature: <span class="v29_74">21°C</span>
        html = html.replace(
            /(<span class="v29_74">)[^<]*(<\/span>)/,
            `$1${data.temp}°C$2`
        );
        
        // PM2.5 value: <span class="v30_85">116</span>
        html = html.replace(
            /(<span class="v30_85">)[^<]*(<\/span>)/,
            `$1${data.pm25}$2`
        );
        
        // Weather condition: <span class="v29_75">IDEAL COMFORT</span>
        html = html.replace(
            /(<span class="v29_75">)[^<]*(<\/span>)/,
            `$1${data.condition}$2`
        );
        
        // Save updated HTML for reference
        const htmlPath = join(distDir, 'image.html');
        await writeFile(htmlPath, html, 'utf-8');
        console.log(`[generate-static] Updated HTML saved to ${htmlPath}`);

        console.log('[generate-static] Converting HTML to PNG...');
        
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
