/**
 * Combined Action Thresholds (Temperature, Humidity, and Weather)
 * - Temp (°C): Celsius thresholds for simplicity.
 * - Humidity (%): Relative Humidity thresholds.
 */
const combinedWeatherActions = [
    // --- EXTREME COLD (Temperature < 5°C) ---
    { tempMax: 5, humidityMin: 0, weatherCodes: [511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], action: "Dress warmest, avoid all travel. Extreme cold risk.", condition: "Severe Winter Weather" },
    { tempMax: 5, humidityMin: 0, weatherCodes: [800, 801, 802, 803, 804], action: "Wear heavy layers, cover skin. Cold wind risk.", condition: "Freezing Cold" },

    // --- COLD + HIGH HUMIDITY (Temperature 5°C to 15°C, Humid) ---
    // High humidity (e.g., above 70%) can feel colder due to rapid heat loss.
    { tempMax: 15, humidityMin: 70, weatherCodes: null, action: "Wear warm, insulating layers. Indoor mold check.", condition: "Chilly & Damp" },

    // --- HOT & HIGH HUMIDITY (Temperature > 30°C, Humid) ---
    { tempMin: 30, humidityMin: 75, weatherCodes: null, action: "Stay hydrated, limit activity. Heat stress danger.", condition: "Extreme Humidity/Muggy" },
    { tempMin: 30, humidityMin: 50, weatherCodes: null, action: "Wear light clothes, drink water often. High heat index.", condition: "Very Hot & Humid" },

    // --- HOT & LOW HUMIDITY (Temperature > 30°C, Dry) ---
    // Low humidity can cause rapid dehydration, even if it "feels" cooler.
    { tempMin: 30, humidityMax: 40, weatherCodes: null, action: "Hydrate constantly, protect skin. Dehydration risk.", condition: "Hot & Dry" },

    // --- MODERATE/COMFORTABLE (Temperature 15°C to 30°C) ---
    { tempMin: 15, tempMax: 30, humidityMax: 40, weatherCodes: null, action: "Enjoy outdoors, stay hydrated. Dry air check.", condition: "Pleasant & Dry" },
    { tempMin: 15, tempMax: 30, humidityMin: 70, weatherCodes: null, action: "Comfortable, minor stickiness. Good time for light walk.", condition: "Warm & Humid" },
    { tempMin: 15, tempMax: 30, humidityMin: 41, humidityMax: 69, weatherCodes: null, action: "Perfect weather day! Enjoy!", condition: "Ideal Comfort" },

    // --- RAIN/STORM/MIST (Primary Weather Risk) ---
    // Note: These must be checked after temperature to ensure they prioritize immediate physical risk.
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232], action: "Seek immediate shelter. Severe T-Storm risk.", condition: "Thunderstorm" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [502, 503, 504, 522], action: "Avoid travel, stay indoors. Heavy rain/flood risk.", condition: "Heavy Rain" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [300, 301, 302, 310, 311, 312, 313, 314, 321, 500, 501, 520, 521, 531], action: "Bring umbrella/rain gear. Wet roads.", condition: "Rain/Drizzle" },
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [701, 711, 721, 741], action: "Low visibility, drive with caution. Wear mask if smoky.", condition: "Mist/Fog/Haze" },
    
    // --- Default Clear/Cloudy ---
    { tempMin: -Infinity, tempMax: Infinity, weatherCodes: [800, 801, 802, 803, 804], action: "Standard day. Check UV index for sun safety.", condition: "Clear/Cloudy Sky" },
];


/**
 * Icon Description Map (Based on provided OpenWeatherMap icons)
 */
const iconDescriptions = {
    "01d": { description: "Clear Sky (Day)", detail: "Sun is out, no clouds." },
    "01n": { description: "Clear Sky (Night)", detail: "Stars/Moon visible, no clouds." },
    "02d": { description: "Few Clouds (Day)", detail: "Mostly sunny with minimal cloud cover." },
    "02n": { description: "Few Clouds (Night)", detail: "Clear with a few scattered clouds." },
    "03d": { description: "Scattered Clouds (Day)", detail: "Partly cloudy, sun is visible." },
    "03n": { description: "Scattered Clouds (Night)", detail: "Partially covered sky." },
    "04d": { description: "Broken Clouds (Day)", detail: "Mostly cloudy, but not completely overcast." },
    "04n": { description: "Broken Clouds (Night)", detail: "Predominantly cloudy night." },
    "09d": { description: "Shower Rain/Drizzle", detail: "Intermittent light to moderate rain showers." },
    "09n": { description: "Shower Rain/Drizzle", detail: "Intermittent light to moderate rain showers." },
    "10d": { description: "Rain", detail: "Steady, moderate rainfall." },
    "10n": { description: "Rain", detail: "Steady, moderate rainfall." },
    "11d": { description: "Thunderstorm", detail: "Lightning and thunder present. Seek shelter." },
    "11n": { description: "Thunderstorm", detail: "Lightning and thunder present. Seek shelter." },
    "13d": { description: "Snow", detail: "Snowfall or freezing rain." },
    "13n": { description: "Snow", detail: "Snowfall or freezing rain." },
    "50d": { description: "Mist/Fog/Haze", detail: "Low visibility due to atmospheric conditions (mist, fog, smoke)." },
    "50n": { description: "Mist/Fog/Haze", detail: "Low visibility due to atmospheric conditions (mist, fog, smoke)." },
};