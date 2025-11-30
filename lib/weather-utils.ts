/**
 * Shared Weather & AQI Configuration and Utilities
 */

// Configuration
export const CONFIG = {
    lat: 21.0285,
    lon: 105.8542,
    locationLabel: 'HANOI, VIETNAM',
    quote: "A quiet sea never made a skilled sailor.",
    refreshInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
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
    { max: 12, status: 'GOOD', action: 'Fresh air', iconKey: 'smile', color: '#00e400' },
    { max: 35.4, status: 'MODERATE', action: 'Limit exposure', iconKey: 'breeze', color: '#ffff00' },
    { max: 55.4, status: 'UNHEALTHY (SG)', action: 'Mask up', iconKey: 'mask', color: '#ff7e00' },
    { max: 150.4, status: 'UNHEALTHY', action: 'Wear mask', iconKey: 'mask', color: '#ff0000' },
    { max: 250.4, status: 'VERY UNHEALTHY', action: 'Stay indoors', iconKey: 'home', color: '#8f3f97' },
    { max: Infinity, status: 'HAZARDOUS', action: 'Avoid outdoors', iconKey: 'mask', color: '#7e0023' },
];

// Interfaces
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

// Format time as HH:MM
export function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });
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

// Process weather and AQI data into display values
export function processWeatherData(weather: WeatherData, aqi: AQIData) {
    const temp = Math.round(weather.main?.temp || 0);
    const feelsLike = Math.round(weather.main?.feels_like || temp);
    const humidity = weather.main?.humidity || 0;
    const windSpeed = kmhFromMs(weather.wind?.speed || 0);
    const weatherId = weather.weather?.[0]?.id || 800;
    const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
    const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);

    const weatherAction = pickWeatherAction(temp, humidity, weatherId);
    const aqiAction = pickAQIAction(pm25);

    return {
        temp,
        feelsLike,
        humidity,
        windSpeed,
        weatherId,
        description,
        pm25,
        weatherAction,
        aqiAction,
    };
}
