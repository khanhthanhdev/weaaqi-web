const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  // If dotenv is not installed, manually read .env file
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
          }
        }
      });
      console.log('Loaded .env file manually');
    }
  } catch (envError) {
    console.warn('Could not load .env file:', envError.message);
  }
}

const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to get Puppeteer launch options
// Works in both local and serverless environments
async function getPuppeteerLaunchOptions() {
  // Better serverless detection - check multiple indicators
  const cwd = process.cwd();
  const isServerless = 
    process.env.VERCEL === '1' || 
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    cwd.includes('/var/task') ||
    cwd.includes('/tmp') ||
    cwd.includes('/vercel') ||
    // Check if we're in a serverless runtime
    (process.env.NODE_ENV === 'production' && !process.env.CHROME_PATH);
  
  console.log('Environment detection:', {
    isServerless,
    cwd,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
    NODE_ENV: process.env.NODE_ENV,
  });
  
  if (isServerless) {
    // Configure Chromium for serverless
    chromium.setGraphicsMode = false;
    
    try {
      // Get Chromium executable path
      const executablePath = await chromium.executablePath();
      
      // Verify the executable exists
      if (!executablePath) {
        throw new Error('Chromium executable path is empty');
      }
      
      console.log('Using serverless Chromium configuration');
      console.log('Executable path:', executablePath);
      console.log('Chromium args:', chromium.args);
      
      return {
        args: [
          ...chromium.args,
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      };
    } catch (error) {
      console.error('Error getting Chromium executable path:', error);
      throw new Error(`Failed to initialize Chromium for serverless: ${error.message}. Make sure @sparticuz/chromium is properly installed.`);
    }
  } else {
    // Local development - try to use system Chrome/Chromium
    // On Linux, you might need to install chromium-browser or google-chrome
    console.log('Using local Chromium configuration');
    return {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // Try common Chrome/Chromium paths
      executablePath: process.env.CHROME_PATH || 
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'linux' ? '/usr/bin/chromium-browser' : undefined) ||
        (process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined) ||
        (process.platform === 'linux' ? '/usr/bin/chromium' : undefined)
    };
  }
}

// OpenWeather API configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
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

// Weather action rules (from weather-utils.ts)
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

// Get action text based on AQI status (matching generate-static.ts)
function getActionText(aqiStatus) {
  if (aqiStatus && (aqiStatus.includes('GOOD') || aqiStatus.includes('MODERATE'))) {
    return 'PERFECT WEATHER';
  }
  return 'WEAR MASK';
}

// Fetch and process real weather data
async function getWeatherData() {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OPENWEATHER_API_KEY not set, using default data');
    return null;
  }

  try {
    const [weather, aqi] = await Promise.all([
      fetchWeatherData(OPENWEATHER_API_KEY),
      fetchAQIData(OPENWEATHER_API_KEY)
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

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/figma-to-html', express.static('figma-to-html'));

// Read CSS file
const cssPath = path.join(__dirname, 'figma-to-html', 'css', 'main.css');
let templateCSS = '';
try {
  templateCSS = fs.readFileSync(cssPath, 'utf8');
} catch (error) {
  console.warn('Could not read CSS file, using fallback');
}

// Helper function to convert image to base64 for Puppeteer
const getImageBase64 = (imagePath) => {
  try {
    const fullPath = path.join(__dirname, 'figma-to-html', 'images', imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.warn(`Could not load image: ${imagePath}`);
    return '';
  }
};

// HTML Template matching figma-to-html structure
const getHTML = (data = {}, useBase64Images = false) => {
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

  // Update CSS with image paths
  let css = templateCSS || '';
  if (useBase64Images) {
    // Replace image URLs in CSS with base64 for Puppeteer
    css = css.replace(/url\(["']?\.\.\/images\/([^"')]+)["']?\)/g, (match, imgName) => {
      const base64 = getImageBase64(imgName);
      return base64 ? `url(${base64})` : match;
    });
    // Override body and html styles for image generation - remove centering and background
    // Also ensure only yellow, black, white colors are used
    css += `
    html, body {
      margin: 0;
      padding: 0;
      width: 800px;
      height: 480px;
      overflow: hidden;
      background: #ffffff;
    }
    body {
      display: block;
      background: #ffffff;
      min-height: auto;
    }
    .v36_37 {
      position: absolute;
      top: 0;
      left: 0;
    }
    `;
  } else {
    // Replace relative paths with absolute paths for browser
    css = css.replace(/url\(["']?\.\.\/images\/([^"')]+)["']?\)/g, (match, imgName) => {
      return `url(/figma-to-html/images/${imgName})`;
    });
    // Ensure body background is white (not gray) for browser view
    css = css.replace(/background:\s*#f0f0f0/g, 'background: #ffffff');
  }

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
};

// Route: Hiển thị HTML
app.get('/', async (req, res) => {
  const realData = await getWeatherData();
  res.send(getHTML(realData || req.query));
});

// Route: Render HTML với data tùy chỉnh
app.get('/preview', async (req, res) => {
  const realData = await getWeatherData();
  res.send(getHTML(realData || req.query));
});

// Route: Tạo ảnh từ HTML
app.get('/api/image', async (req, res) => {
  let browser;
  
  try {
    // Fetch real weather data if API key is available, otherwise use query params or defaults
    let data = req.query;
    if (Object.keys(req.query).length === 0 || !req.query.temperature) {
      // No query params provided, fetch real data
      const realData = await getWeatherData();
      if (realData) {
        data = realData;
      }
    }

    // Launch Puppeteer with appropriate configuration
    const launchOptions = await getPuppeteerLaunchOptions();
    console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Set viewport to exact template size
    await page.setViewport({
      width: 800,
      height: 480,
      deviceScaleFactor: 1 // Use 1 for exact size match
    });

    // Set HTML content với data (use base64 images for Puppeteer)
    const html = getHTML(data, true);
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // Wait for fonts and images to load
    await page.evaluateHandle('document.fonts.ready');
    await page.waitForTimeout(500); // Additional wait for images

    // Chụp screenshot of the exact container size
    const imageBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 800,
        height: 480
      }
    });

    // Trả về ảnh
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Route: API để lấy ảnh với POST data
app.post('/api/image', async (req, res) => {
  let browser;
  
  try {
    // Use POST body data, or fetch real data if body is empty
    let data = req.body;
    if (!data || Object.keys(data).length === 0 || !data.temperature) {
      const realData = await getWeatherData();
      if (realData) {
        data = realData;
      }
    }

    const launchOptions = await getPuppeteerLaunchOptions();
    console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({
      width: 800,
      height: 480,
      deviceScaleFactor: 1
    });

    const html = getHTML(data, true);
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    await page.evaluateHandle('document.fonts.ready');
    await page.waitForTimeout(500);

    const imageBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 800,
        height: 480
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error generating image:', error);
    console.error('Error stack:', error.stack);
    console.error('Current working directory:', process.cwd());
    console.error('Environment:', {
      VERCEL: process.env.VERCEL,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
    });
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server only if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`View HTML: http://localhost:${PORT}/`);
    console.log(`Generate Image: http://localhost:${PORT}/api/image`);
    if (OPENWEATHER_API_KEY) {
      console.log(`\n✓ OpenWeather API key found - using real weather data`);
    } else {
      console.log(`\n⚠ OpenWeather API key not found - using default data`);
      console.log(`Set OPENWEATHER_API_KEY environment variable to fetch real data`);
    }
    console.log(`\nExample with custom data (overrides real data):`);
    console.log(`http://localhost:${PORT}/api/image?temperature=30&humidity=60&condition=SUNNY`);
  });
}

module.exports = app;