import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImageResponse } from '@vercel/og';
import {
    fetchWeatherData,
    fetchAQIData,
    pickWeatherAction,
    pickAQIAction,
    getAqiActionForWeather,
    formatDate,
    formatTime,
    kmhFromMs,
    CONFIG,
    type WeatherData,
    type AQIData,
} from './weather-utils';

// Load Inter font from Google Fonts
// Note: @vercel/og supports TTF, OTF, and WOFF formats (not WOFF2)
// For best performance and reliability, consider downloading TTF/OTF font files
// and bundling them locally, then loading with fs.readFile
// For now, we'll use system fonts as fallback which work well
async function loadInterFont() {
    // TODO: Download Inter TTF/OTF font files and bundle them locally
    // Example:
    // const fontData = await fs.readFile(join(process.cwd(), 'fonts', 'Inter-Regular.ttf'));
    // return fontData.buffer;
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const startTime = Date.now();
    const isCronRequest = req.headers['user-agent']?.includes('vercel-cron') || 
                          req.headers['x-vercel-cron'] === '1';
    
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            console.error('[og] API key not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`[og] ${isCronRequest ? '[CRON]' : '[REQUEST]'} Generating OG image with fresh data...`);
        
        // Fetch data
        let weather, aqi;
        try {
            console.log('[og] Fetching weather and AQI data...');
            [weather, aqi] = await Promise.all([
                fetchWeatherData(apiKey),
                fetchAQIData(apiKey),
            ]);
            console.log('[og] Data fetched successfully');
        } catch (fetchError) {
            const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
            console.error('[og] Failed to fetch data:', errorMessage);
            throw new Error(`Data fetch failed: ${errorMessage}`);
        }
        
        // Validate data
        if (!weather || !weather.main) {
            throw new Error('Invalid weather data received');
        }
        if (!aqi || !aqi.list || !aqi.list[0]) {
            throw new Error('Invalid AQI data received');
        }

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
        const now = new Date();
        const dateStr = formatDate(now);
        const timeStr = formatTime(now);
        
        // Get AQI color
        const aqiColor = baseAqiAction.color || '#ffc800';

        console.log('[og] Generating image with @vercel/og...');

        // Load Inter font (optional - system fonts will be used if not provided)
        const interFont = await loadInterFont();
        const fonts = interFont ? [
            {
                name: 'Inter',
                data: interFont,
                style: 'normal' as const,
                weight: 400,
            },
        ] : [];

        // Generate image using @vercel/og - matching template exactly
        const response = new ImageResponse(
            (
                <div
                    style={{
                        width: 800,
                        height: 480,
                        background: 'white',
                        position: 'relative',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                >
                    {/* v13_6031: Date and location - yellow text */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 13,
                            left: 189,
                            width: 391,
                            color: '#ffff00',
                            fontSize: 24,
                            fontWeight: 900,
                            fontFamily: 'Inter',
                            textAlign: 'left',
                        }}
                    >
                        {dateStr} | {CONFIG.locationLabel}
                    </div>

                    {/* v36_35: Update time */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 18,
                            left: 667,
                            width: 120,
                            color: 'black',
                            fontSize: 15,
                            fontWeight: 500,
                            fontFamily: 'Inter',
                            textAlign: 'left',
                        }}
                    >
                        Update at: {timeStr}
                    </div>

                    {/* v29_75: Condition text */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 58,
                            left: 242,
                            width: 320,
                            color: 'black',
                            fontSize: 32,
                            fontWeight: 700,
                            fontFamily: 'Inter',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {weatherAction?.condition?.toUpperCase() || description}
                    </div>

                    {/* v29_74: Temperature */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 97,
                            left: 233,
                            width: 281,
                            color: 'black',
                            fontSize: 96,
                            fontWeight: 700,
                            fontFamily: 'Inter',
                            textAlign: 'left',
                        }}
                    >
                        {temp}°C
                    </div>

                    {/* v26_30: Hero action border box */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 222,
                            left: 37,
                            width: 448,
                            height: 80,
                            border: '1px solid black',
                            borderRadius: 10,
                        }}
                    />

                    {/* v26_31: Hero action text */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 234,
                            left: 45,
                            width: 448,
                            color: 'black',
                            fontSize: 36,
                            fontWeight: 700,
                            fontFamily: 'Inter',
                            textAlign: 'center',
                        }}
                    >
                        {weatherAction?.action?.toUpperCase() || ''}
                    </div>

                    {/* v36_32: AQI Action */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 304,
                            left: 660,
                            width: 123,
                            color: 'black',
                            fontSize: 40,
                            fontWeight: 700,
                            fontFamily: 'Inter',
                            textAlign: 'left',
                        }}
                    >
                        {aqiAction.action.toUpperCase()}
                    </div>

                    {/* v14_6033: Humidity box */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 331,
                            left: 37,
                            width: 134,
                            height: 66,
                            background: 'black',
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            paddingLeft: 12,
                        }}
                    >
                        <div
                            style={{
                                color: 'white',
                                fontSize: 15,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                marginTop: -8,
                            }}
                        >
                            Humidity
                        </div>
                        <div
                            style={{
                                color: 'white',
                                fontSize: 24,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                marginTop: 2,
                            }}
                        >
                            {humidity} %
                        </div>
                    </div>

                    {/* v25_2: Feels like box */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 331,
                            left: 189,
                            width: 151,
                            height: 66,
                            background: 'black',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            paddingLeft: 12,
                        }}
                    >
                        <div
                            style={{
                                color: 'white',
                                fontSize: 15,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                marginTop: -8,
                            }}
                        >
                            Feels Like
                        </div>
                        <div
                            style={{
                                color: 'white',
                                fontSize: 24,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                marginTop: 2,
                            }}
                        >
                            {feelsLike}° C
                        </div>
                    </div>

                    {/* v25_3: Wind box */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 331,
                            left: 350,
                            width: 123,
                            height: 66,
                            background: 'black',
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            paddingLeft: 12,
                        }}
                    >
                        <div
                            style={{
                                color: 'white',
                                fontSize: 15,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                marginTop: -8,
                            }}
                        >
                            Wind
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                marginTop: 2,
                            }}
                        >
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 24,
                                    fontWeight: 700,
                                    fontFamily: 'Inter',
                                }}
                            >
                                {windSpeed}
                            </div>
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    fontFamily: 'Inter',
                                    marginLeft: 4,
                                    marginTop: 4,
                                }}
                            >
                                km/h
                            </div>
                        </div>
                    </div>

                    {/* v30_81: AQI Circle */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 71,
                            left: 560,
                            width: 200,
                            height: 200,
                            borderRadius: '50%',
                            background: 'black',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* v30_84: PM2.5 label */}
                        <div
                            style={{
                                color: 'white',
                                fontSize: 40,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                textAlign: 'center',
                                marginTop: -20,
                            }}
                        >
                            PM2.5
                        </div>
                        {/* v30_85: AQI value - yellow */}
                        <div
                            style={{
                                color: aqiColor,
                                fontSize: 80,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                textAlign: 'center',
                                lineHeight: 1,
                                marginTop: 4,
                            }}
                        >
                            {pm25}
                        </div>
                        {/* v30_86: AQI status */}
                        <div
                            style={{
                                color: 'white',
                                fontSize: 16,
                                fontWeight: 700,
                                fontFamily: 'Inter',
                                textAlign: 'center',
                                marginTop: 8,
                            }}
                        >
                            {baseAqiAction.status}
                        </div>
                    </div>

                    {/* v38_39: Quote */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 434,
                            left: 310,
                            width: 459,
                            color: 'black',
                            fontSize: 24,
                            fontWeight: 500,
                            fontStyle: 'italic',
                            fontFamily: 'Inter',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        "{CONFIG.quote}"
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 480,
                fonts: fonts,
            }
        );

        const generationTime = Date.now() - startTime;
        console.log(`[og] ${isCronRequest ? '[CRON]' : '[REQUEST]'} OG image generated successfully in ${generationTime}ms`);

        // Convert Response to buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Set headers for optimal caching
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900');
        res.setHeader('X-Generated-At', new Date().toISOString());
        
        if (isCronRequest) {
            console.log(`[og] [CRON] Image pre-generated at ${new Date().toISOString()}`);
        }
        
        return res.send(buffer);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[og] Error generating image:`, errorMessage);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to generate image', 
                details: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }
}

