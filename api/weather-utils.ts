/**
 * Shared utilities for Weather & AQI Dashboard
 * Used by both generate-static.ts and api/image.ts
 */

// Configuration
export const CONFIG = {
    lat: 21.0285,
    lon: 105.8542,
    locationLabel: 'HANOI, VIETNAM',
    quote: "A quiet sea never made a skilled sailor.",
    refreshInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
    outputDir: './dist',
    templateFile: './templates/index.template.html',
};

// Weather action rules
export const WEATHER_ACTIONS = [
    { tempMax: 5, humidityMin: 0, weatherCodes: [511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], action: "Stay warm", condition: "Severe Winter", iconKey: "cold" },
    { tempMax: 5, humidityMin: 0, weatherCodes: [800, 801, 802, 803, 804], action: "Stay warm", condition: "Freezing Cold", iconKey: "cold" },
    { tempMax: 10, humidityMin: 0, weatherCodes: null, action: "Warm tea", condition: "Cold", iconKey: "tea" },
    { tempMax: 15, humidityMin: 70, weatherCodes: null, action: "Wear layers", condition: "Chilly & Damp", iconKey: "warm" },
    { tempMin: 35, humidityMin: 50, weatherCodes: null, action: "Stay hydrated", condition: "Very Hot", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 75, weatherCodes: null, action: "Drink water", condition: "Extreme Humidity", iconKey: "sunglasses" },
    { tempMin: 30, humidityMin: 50, weatherCodes: null, action: "Stay cool", condition: "Very Hot", iconKey: "sunglasses" },
    { tempMin: 30, humidityMax: 40, weatherCodes: null, action: "Hydrate well", condition: "Hot & Dry", iconKey: "sunglasses" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232], action: "Take shelter", condition: "Thunderstorm", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [502, 503, 504, 522], action: "Heavy rain", condition: "Heavy Rain", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [300, 301, 302, 310, 311, 312, 313, 314, 321, 500, 501, 520, 521, 531], action: "Bring umbrella", condition: "Rain/Drizzle", iconKey: "umbrella" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [701, 711, 721, 741], action: "Wear mask", condition: "Mist/Fog/Haze", iconKey: "haze" },
    { tempMin: 25, tempMax: 35, humidityMax: 40, weatherCodes: [800, 801], action: "Great day", condition: "Sunny", iconKey: "sunglasses" },
    { tempMin: 15, tempMax: 30, humidityMax: 40, weatherCodes: null, action: "Enjoy outdoors", condition: "Pleasant & Dry", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 70, weatherCodes: null, action: "Light walk", condition: "Warm & Humid", iconKey: "sunny" },
    { tempMin: 15, tempMax: 30, humidityMin: 41, humidityMax: 69, weatherCodes: null, action: "Perfect weather", condition: "Ideal Comfort", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [800, 801, 802, 803, 804], action: "Check UV", condition: "Clear/Cloudy", iconKey: "sunny" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: null, action: "Enjoy day", condition: "Comfortable", iconKey: "sunny" },
];

export const AQI_ACTIONS = [
    { max: 12, status: 'GOOD', action: 'Fresh air', iconKey: 'smile', color: '#ffc800' },
    { max: 35.4, status: 'MODERATE', action: 'Limit exposure', iconKey: 'breeze', color: '#ffc800' },
    { max: 55.4, status: 'UNHEALTHY (SG)', action: 'Mask up', iconKey: 'mask', color: '#ffc800' },
    { max: 150.4, status: 'UNHEALTHY', action: 'Wear mask', iconKey: 'mask', color: '#ffc800' },
    { max: 250.4, status: 'VERY UNHEALTHY', action: 'Stay indoors', iconKey: 'home', color: '#ffc800' },
    { max: Infinity, status: 'HAZARDOUS', action: 'Avoid outdoors', iconKey: 'mask', color: '#ffc800' },
];

export const AQI_ACTION_ICONS: Record<string, string> = {
    mask: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M44 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M70 48c2 6 8 6 10 0" stroke="#000" stroke-width="6" stroke-linecap="round"/><rect x="32" y="56" width="56" height="26" rx="8" fill="#fff" stroke="#000" stroke-width="6"/><path d="M32 66c-6 0-12-4-12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M88 66c6 0 12-4 12-10" stroke="#000" stroke-width="6" stroke-linecap="round" fill="none"/><rect x="42" y="62" width="36" height="10" rx="4" fill="#000"/><path d="M42 72c8 6 20 6 28 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    home: `<svg viewBox="0 0 110 110"><path d="M15 60 55 25 95 60v30H15Z" fill="#000"/><rect x="40" y="62" width="30" height="28" rx="4" fill="#ffc800"/><rect x="53" y="68" width="10" height="22" fill="#000"/></svg>`,
    breeze: `<svg viewBox="0 0 110 110"><path d="M20 46h52a10 10 0 1 0-10-10" stroke="#000" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M20 70h58a10 10 0 1 1-10 10" stroke="#ffc800" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
    smile: `<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="40" fill="#ffc800" stroke="#000" stroke-width="6"/><circle cx="40" cy="45" r="6" fill="#000"/><circle cx="70" cy="45" r="6" fill="#000"/><path d="M38 68c10 10 24 10 34 0" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    water: `<svg viewBox="0 0 110 110"><path d="M55 10c0 0-35 40-35 60c0 20 15 35 35 35s35-15 35-35c0-20-35-60-35-60z" fill="#ffc800" stroke="#000" stroke-width="6"/><path d="M40 70c5-5 15-5 20 0" stroke="#000" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="55" cy="85" rx="20" ry="8" fill="#000" opacity="0.2"/></svg>`,
};

export interface WeatherData {
    weather: Array<{ id: number; description: string; icon: string }>;
    main: { temp: number; feels_like: number; humidity: number };
    wind: { speed: number };
}

export interface AQIData {
    list: Array<{ components: { pm2_5: number } }>;
}

// Fetch weather data from OpenWeather API
export async function fetchWeatherData(apiKey: string): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${CONFIG.lat}&lon=${CONFIG.lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Fetch AQI data from OpenWeather API
export async function fetchAQIData(apiKey: string): Promise<AQIData> {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${CONFIG.lat}&lon=${CONFIG.lon}&appid=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`AQI API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Pick weather action based on conditions
export function pickWeatherAction(temp: number, humidity: number, weatherId: number) {
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
export function pickAQIAction(pm25: number) {
    return AQI_ACTIONS.find(rule => pm25 <= rule.max) ?? AQI_ACTIONS[AQI_ACTIONS.length - 1];
}

// Get AQI action adjusted for weather
export function getAqiActionForWeather(aqiAction: typeof AQI_ACTIONS[0], temp: number) {
    if (temp >= 30 && aqiAction.max <= 100) {
        return { ...aqiAction, action: 'Drink water', iconKey: 'water' };
    }
    return aqiAction;
}

// Format time as HH:MM
export function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format date as "MMM DD, YYYY"
export function formatDate(date: Date): string {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Convert m/s to km/h
export function kmhFromMs(speedMs: number): number {
    return Math.round(speedMs * 3.6);
}

// Calculate AQI gauge arc
export function calculateAqiArc(pm25: number): { arcLength: number; circumference: number } {
    const maxPM25 = 360;
    const normalizedValue = Math.min(pm25 / maxPM25, 1);
    const radius = 94;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * normalizedValue;
    return { arcLength, circumference };
}

// Generate HTML with data replacements
export function generateHTML(
    template: string, 
    css: string,
    weather: WeatherData, 
    aqi: AQIData,
    imageDataUrls: Record<string, string> = {}
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

    // Replace placeholders in template
    const replacements: Record<string, string> = {
        '{{DATE}}': dateStr,
        '{{LOCATION}}': CONFIG.locationLabel,
        '{{CONDITION}}': weatherAction?.condition?.toUpperCase() || description,
        '{{TEMPERATURE}}': `${temp}°C`,
        '{{HERO_ACTION}}': weatherAction?.action?.toUpperCase() || '',
        '{{HUMIDITY}}': `${humidity} %`,
        '{{FEELS_LIKE}}': `${feelsLike}° C`,
        '{{WIND_VALUE}}': String(windSpeed),
        '{{WIND_UNIT}}': 'km/h',
        '{{AQI_VALUE}}': String(pm25),
        '{{AQI_STATUS}}': baseAqiAction.status,
        '{{AQI_ACTION}}': aqiAction.action.toUpperCase(),
        '{{AQI_ICON}}': AQI_ACTION_ICONS[aqiAction.iconKey] ?? AQI_ACTION_ICONS.mask,
        '{{AQI_COLOR}}': baseAqiAction.color || '#ffc800',
        '{{QUOTE}}': CONFIG.quote,
        '{{LAST_UPDATED}}': timeStr,
    };

    let html = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replaceAll(placeholder, value);
    }

    // Replace url() references in CSS with data URLs
    let processedCss = css;
    for (const [filename, dataUrl] of Object.entries(imageDataUrls)) {
        processedCss = processedCss.replace(
            new RegExp(`url\\("?\\.\\.\\/images\\/${filename}"?\\)`, 'g'),
            `url("${dataUrl}")`
        );
    }

    // Inline CSS
    html = html.replace(
        '<link href="./css/main.css" rel="stylesheet" />',
        `<style>${processedCss}</style>`
    );

    return html;
}
