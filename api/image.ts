import type { VercelRequest, VercelResponse } from '@vercel/node';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import {
    CONFIG,
    fetchWeatherData,
    fetchAQIData,
    pickWeatherAction,
    pickAQIAction,
    getAqiActionForWeather,
    formatDate,
    formatTime,
    kmhFromMs,
} from '../lib/weather-utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Fetch fresh data
        const [weather, aqi] = await Promise.all([
            fetchWeatherData(apiKey),
            fetchAQIData(apiKey),
        ]);

        const now = new Date();
        const temp = Math.round(weather.main?.temp || 0);
        const feelsLike = Math.round(weather.main?.feels_like || temp);
        const humidity = weather.main?.humidity || 0;
        const windSpeed = kmhFromMs(weather.wind?.speed || 0);
        const description = weather.weather?.[0]?.description?.toUpperCase() || 'UNKNOWN';
        const weatherId = weather.weather?.[0]?.id || 800;
        const pm25 = Math.round(aqi.list?.[0]?.components?.pm2_5 || 0);

        // Get actions
        const weatherAction = pickWeatherAction(temp, humidity, weatherId);
        const baseAqiAction = pickAQIAction(pm25);
        const aqiAction = getAqiActionForWeather(baseAqiAction, temp);

        // Load Inter font
        const fontResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff');
        if (!fontResponse.ok) {
            throw new Error('Failed to fetch font');
        }
        const fontData = await fontResponse.arrayBuffer();

        // Bold font
        const fontBoldResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff');
        const fontBoldData = fontBoldResponse.ok ? await fontBoldResponse.arrayBuffer() : fontData;

        const dateStr = formatDate(now);
        const timeStr = formatTime(now);

        // Create the dashboard layout matching the template design
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        width: '800px',
                        height: '480px',
                        background: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'Inter',
                        position: 'relative',
                    },
                    children: [
                        // Header - Date and Location (yellow text)
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '13px',
                                    left: '189px',
                                    color: '#FFFF00',
                                    fontSize: '24px',
                                    fontWeight: 900,
                                },
                                children: `${dateStr} | ${CONFIG.locationLabel}`,
                            },
                        },
                        // Update time
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '18px',
                                    left: '667px',
                                    color: '#000',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                },
                                children: `Update at: ${timeStr}`,
                            },
                        },
                        // Condition text
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '58px',
                                    left: '242px',
                                    color: '#000',
                                    fontSize: '32px',
                                    fontWeight: 700,
                                },
                                children: weatherAction?.condition?.toUpperCase() || description,
                            },
                        },
                        // Temperature
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '97px',
                                    left: '233px',
                                    color: '#000',
                                    fontSize: '96px',
                                    fontWeight: 700,
                                },
                                children: `${temp}°C`,
                            },
                        },
                        // Hero Action Box Border
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '222px',
                                    left: '37px',
                                    width: '448px',
                                    height: '80px',
                                    border: '1px solid #000',
                                    borderRadius: '10px',
                                },
                            },
                        },
                        // Hero Action Text
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '234px',
                                    left: '45px',
                                    width: '448px',
                                    color: '#000',
                                    fontSize: '36px',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                },
                                children: weatherAction?.action?.toUpperCase() || '',
                            },
                        },
                        // AQI Circle Background
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '71px',
                                    left: '560px',
                                    width: '200px',
                                    height: '200px',
                                    background: '#000',
                                    borderRadius: '50%',
                                },
                            },
                        },
                        // AQI Value
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '135px',
                                    left: '590px',
                                    width: '140px',
                                    color: '#FFFF00',
                                    fontSize: '80px',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    lineHeight: 1,
                                },
                                children: `${pm25}`,
                            },
                        },
                        // AQI Action
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '304px',
                                    left: '580px',
                                    color: '#000',
                                    fontSize: '32px',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    width: '200px',
                                },
                                children: aqiAction.action.toUpperCase(),
                            },
                        },
                        // Stats boxes background
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '331px',
                                    left: '37px',
                                    width: '134px',
                                    height: '66px',
                                    background: '#000',
                                    borderRadius: '10px',
                                },
                            },
                        },
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '331px',
                                    left: '189px',
                                    width: '151px',
                                    height: '66px',
                                    background: '#000',
                                },
                            },
                        },
                        {
                            type: 'div',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '331px',
                                    left: '350px',
                                    width: '123px',
                                    height: '66px',
                                    background: '#000',
                                    borderRadius: '10px',
                                },
                            },
                        },
                        // Humidity label
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '339px',
                                    left: '88px',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                },
                                children: 'Humidity',
                            },
                        },
                        // Humidity value
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '358px',
                                    left: '88px',
                                    color: 'white',
                                    fontSize: '24px',
                                    fontWeight: 700,
                                },
                                children: `${humidity} %`,
                            },
                        },
                        // Feels Like label
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '339px',
                                    left: '257px',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                },
                                children: 'Feels Like',
                            },
                        },
                        // Feels Like value
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '358px',
                                    left: '257px',
                                    color: 'white',
                                    fontSize: '24px',
                                    fontWeight: 700,
                                },
                                children: `${feelsLike}° C`,
                            },
                        },
                        // Wind label
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '339px',
                                    left: '402px',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                },
                                children: 'Wind',
                            },
                        },
                        // Wind value
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '358px',
                                    left: '403px',
                                    color: 'white',
                                    fontSize: '24px',
                                    fontWeight: 700,
                                },
                                children: `${windSpeed}`,
                            },
                        },
                        // Wind unit
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '372px',
                                    left: '433px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                },
                                children: 'km/h',
                            },
                        },
                        // Quote
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '434px',
                                    left: '310px',
                                    color: '#000',
                                    fontSize: '24px',
                                    fontWeight: 500,
                                    fontStyle: 'italic',
                                },
                                children: `"${CONFIG.quote}"`,
                            },
                        },
                        // Footer - INTRO TO CECS
                        {
                            type: 'span',
                            props: {
                                style: {
                                    position: 'absolute',
                                    top: '435px',
                                    left: '14px',
                                    color: '#000',
                                    fontSize: '24px',
                                    fontWeight: 900,
                                },
                                children: 'INTRO TO CECS',
                            },
                        },
                    ],
                },
            },
            {
                width: 800,
                height: 480,
                fonts: [
                    {
                        name: 'Inter',
                        data: fontData,
                        weight: 400,
                        style: 'normal',
                    },
                    {
                        name: 'Inter',
                        data: fontBoldData,
                        weight: 700,
                        style: 'normal',
                    },
                ],
            }
        );

        // Convert SVG to PNG using resvg
        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: 800,
            },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        res.setHeader('Content-Type', 'image/png');
        // Cache for 15 minutes (900 seconds), revalidate after
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
        return res.send(Buffer.from(pngBuffer));
    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ error: 'Failed to generate image', details: String(error) });
    }
}
