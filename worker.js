/**
 * Cloudflare Worker for weaaqi-page
 * 
 * Note: Puppeteer image generation is not available in Cloudflare Workers.
 * The /api/image routes will return an error message.
 * Consider using Cloudflare Images API or an external service for image generation.
 */

// OpenWeather API configuration
const HANOI_LAT = 21.0285;
const HANOI_LON = 105.8542;

// Fetch weather data from OpenWeather API
async function fetchWeatherData(apiKey) {
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY not set');
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${HANOI_LAT}&lon=${HANOI_LON}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.statusText}`);
  }
  return response.json();
}

// Fetch AQI data from OpenWeather API
async function fetchAQIData(apiKey) {
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY not set');
  }
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${HANOI_LAT}&lon=${HANOI_LON}&appid=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`AQI API error: ${response.statusText}`);
  }
  return response.json();
}

// Get AQI status based on PM2.5 value (using only yellow, black, white)
function getAqiStatus(pm25) {
  if (pm25 <= 12) return { status: 'GOOD', color: '#ffff00' };
  if (pm25 <= 35.4) return { status: 'MODERATE', color: '#ffff00' };
  if (pm25 <= 55.4) return { status: 'UNHEALTHY (SG)', color: '#ffff00' };
  if (pm25 <= 150.4) return { status: 'UNHEALTHY', color: '#ffff00' };
  if (pm25 <= 250.4) return { status: 'VERY UNHEALTHY', color: '#ffff00' };
  return { status: 'HAZARDOUS', color: '#ffff00' };
}

// Format date
function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
}

// Format time
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}

// Weather action rules
const WEATHER_ACTIONS = [
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

const AQI_ACTIONS = [
  { max: 12, status: 'GOOD', action: 'Fresh air', iconKey: 'smile', color: '#ffff00' },
  { max: 35.4, status: 'MODERATE', action: 'Limit exposure', iconKey: 'breeze', color: '#ffff00' },
  { max: 55.4, status: 'UNHEALTHY (SG)', action: 'Mask up', iconKey: 'mask', color: '#ffff00' },
  { max: 150.4, status: 'UNHEALTHY', action: 'Wear mask', iconKey: 'mask', color: '#ffff00' },
  { max: 250.4, status: 'VERY UNHEALTHY', action: 'Stay indoors', iconKey: 'home', color: '#ffff00' },
  { max: Infinity, status: 'HAZARDOUS', action: 'Avoid outdoors', iconKey: 'mask', color: '#ffff00' },
];

// Pick weather action based on conditions
function pickWeatherAction(temp, humidity, weatherId) {
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
function pickAQIAction(pm25) {
  return AQI_ACTIONS.find(rule => pm25 <= rule.max) ?? AQI_ACTIONS[AQI_ACTIONS.length - 1];
}

// Get AQI action adjusted for weather
function getAqiActionForWeather(aqiAction, temp) {
  if (temp >= 30 && aqiAction.max <= 100) {
    return { ...aqiAction, action: 'Drink water', iconKey: 'water' };
  }
  return aqiAction;
}

// Fetch and process real weather data
async function getWeatherData(env) {
  const apiKey = env.OPENWEATHER_API_KEY || env.WEATHER_API_KEY;
  
  if (!apiKey) {
    console.warn('OPENWEATHER_API_KEY not set, using default data');
    return null;
  }

  try {
    const [weather, aqi] = await Promise.all([
      fetchWeatherData(apiKey),
      fetchAQIData(apiKey)
    ]);

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
    const windSpeed = Math.round((weather.wind?.speed || 0) * 3.6); // Convert m/s to km/h
    const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
    const weatherId = weather.weather?.[0]?.id || 800;
    const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);
    const aqiInfo = getAqiStatus(pm25);

    // Get actions using weather-utils logic
    const weatherAction = pickWeatherAction(temp, humidity, weatherId);
    const baseAqiAction = pickAQIAction(pm25);
    const aqiAction = getAqiActionForWeather(baseAqiAction, temp);

    return {
      date: formatDate(now),
      location: 'HANOI, VIETNAM',
      temperature: temp.toString(),
      condition: weatherAction?.condition?.toUpperCase() || description,
      feelsLike: feelsLike.toString(),
      humidity: humidity.toString(),
      wind: windSpeed.toString(),
      aqi: pm25.toString(),
      aqiLevel: aqiInfo.status,
      aqiColor: aqiInfo.color,
      quote: '"A quiet sea never made a skilled sailor."',
      updateTime: formatTime(now),
      warning1: weatherAction?.action?.toUpperCase() || 'ENJOY DAY',
      warning2: aqiAction.action.toUpperCase()
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

// Load CSS from KV or use fallback
// In production, you should store CSS in Workers KV or R2
async function getCSS(env) {
  // Try to load from KV if available
  if (env.CSS_KV) {
    try {
      const css = await env.CSS_KV.get('main.css');
      if (css) return css;
    } catch (error) {
      console.warn('Could not load CSS from KV:', error);
    }
  }
  
  // Fallback: return empty CSS (you should embed or load from external source)
  // For production, consider:
  // 1. Embedding CSS directly in the worker
  // 2. Loading from R2 bucket
  // 3. Loading from external CDN
  return '';
}

// HTML Template matching figma-to-html structure
async function getHTML(data = {}, env = {}) {
  const {
    date = 'NOV 24, 2025',
    location = 'HANOI, VIETNAM',
    temperature = '26',
    condition = 'RAIN/STORM',
    feelsLike = '26',
    humidity = '48',
    wind = '10',
    aqi = '150',
    aqiLevel = 'UNHEALTHY',
    aqiColor = '#ff0000',
    quote = '"A quiet sea never made a skilled sailor."',
    updateTime = '14:30',
    warning1 = 'BRING  UMBRELLA',
    warning2 = 'WEAR MASK'
  } = data;

  // Load CSS
  const templateCSS = await getCSS(env);
  let css = templateCSS || '';
  
  // Replace relative paths with absolute paths for browser
  // Note: In Workers, static assets should be served from R2, KV, or external CDN
  const baseUrl = env.ASSETS_BASE_URL || '';
  css = css.replace(/url\(["']?\.\.\/images\/([^"')]+)["']?\)/g, (match, imgName) => {
    return `url(${baseUrl}/figma-to-html/images/${imgName})`;
  });
  // Ensure body background is white (not gray) for browser view
  css = css.replace(/background:\s*#f0f0f0/g, 'background: #ffffff');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css?family=Inter&display=swap" rel="stylesheet" />
  <style>
${css}
  </style>
</head>
<body>
  <div class="v36_37">
    <div class="v13_6026"></div>
    <div class="v76_4"></div>
    <span class="v13_6031">${date} | ${location}</span>
    <span class="v78_12">INTRO TO CECS</span>
    <div class="v14_6033"></div>
    <div class="v25_2"></div>
    <div class="v25_3"></div>
    <span class="v25_5">Humidity</span>
    <span class="v25_24">${humidity} %</span>
    <span class="v26_26">${wind}</span>
    <span class="v25_25">${feelsLike}° C</span>
    <span class="v25_6">Feels Like</span>
    <span class="v36_35">Update at: ${updateTime}</span>
    <span class="v26_31">${warning1}</span>
    <span class="v36_32">${warning2}</span>
    <span class="v25_7">Wind</span>
    <span class="v26_27">km/h</span>
    <div class="name"></div>
    <div class="v26_30"></div>
    <span class="v29_74">${temperature}°C</span>
    <div class="v30_81"></div>
    <span class="v30_85" style="color: ${aqiColor}">${aqi}</span>
    <span class="v30_86">PM2.5</span>
    <div class="v76_5"></div>
    <div class="name"></div>
    <span class="v38_39">${quote}</span>
    <div class="v41_189"></div>
    <div class="v76_9"></div>
    <div class="v76_10"></div>
    <div class="v76_11"></div>
    <span class="v29_75">${condition}</span>
  </div>
</body>
</html>
  `;
}

// Parse query parameters from URL
function parseQueryParams(url) {
  const params = new URL(url).searchParams;
  const data = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Image generation endpoint (not supported in Workers)
      if (path === '/api/image') {
        return new Response(
          JSON.stringify({ 
            error: 'Image generation is not available in Cloudflare Workers. Puppeteer is not supported. Consider using Cloudflare Images API or an external service.' 
          }),
          {
            status: 501,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Main route: Display HTML
      if (path === '/' || path === '/preview') {
        const queryData = parseQueryParams(url);
        const realData = await getWeatherData(env);
        const data = realData || queryData;
        const html = await getHTML(data, env);
        
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
          }
        });
      }

      // Static assets should be handled by Cloudflare Pages or R2
      // For now, return 404 for unknown routes
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};

