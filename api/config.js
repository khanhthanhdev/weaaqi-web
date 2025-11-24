export default function handler(req, res) {
  // Return the API key from environment variable
  res.status(200).json({
    apiKey: process.env.WEATHER_API_KEY || ''
  });
}
