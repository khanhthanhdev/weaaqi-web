# Weather + AQI Dashboard

Single static page (`index.html`) renders an 800x480 SVG that the Pi Zero 2W can screenshot for the tri-color e-paper HAT. It only uses HTML, CSS and a few lines of vanilla JavaScript.

## OpenWeather endpoints

- Current conditions: `https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={API_KEY}`
- Air quality: `https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}`

Both responses are fetched in parallel, normalized, and used to update the SVG text nodes, the AQI arc, and the needle.

## Configuration

All knobs live inside the `CONFIG` object at the bottom of `index.html`:

- `lat` / `lon`: coordinates the Pi should track.
- `locationLabel`: label printed in the header.
- `refreshMinutes`: hint for how often the Pi should screenshot/refetch (set your cron job to the same cadence).
- `apiKey`: OpenWeather API key. For security, keep this out of source control by injecting it before the dashboard script runs:

```html
<!-- example injection if you serve the HTML via a tiny backend -->
<script>
  window.OPENWEATHER_API_KEY = process.env.WEATHER_API_KEY;
</script>
```

If `window.OPENWEATHER_API_KEY` is defined, the script uses it; otherwise it expects `env-config.js` to export `OPENWEATHER_API_KEY`. Generate that file from `.env` with:

```
node scripts/generate-env.js
```

The script reads `WEATHER_API_KEY` from `.env`, writes `env-config.js` (which is gitignored), and also populates `window.OPENWEATHER_API_KEY` so the page can load the key even when it's hosted as static HTML. Run it whenever `.env` changes.

## Page lifecycle

1. `useSampleData()` runs once so the SVG is never empty (handy for developing offline).
2. `refreshFromAPI()` fires on load and whenever the **Refresh Data** button is pressed. It requests the two OpenWeather endpoints, formats the data (Kelvin -> Celsius, m/s -> km/h, sunrise/sunset -> local time) and updates all of the text nodes.
3. AQI values (1-5) steer the color of the half gauge, the warning label, and the action banner text.
4. Button clicks are debounced via a simple `body.loading` class so repeated refreshes don't stack.

## Deploying to the Pi

1. Serve the folder (for example `python3 -m http.server 8080`).
2. Add a cron job or loop that runs: `chromium-browser --headless --window-size=800,480 --screenshot=/tmp/epaper.png http://localhost:8080`.
3. Push `/tmp/epaper.png` to the driver that owns the 7.5" e-paper HAT.
4. Honor OpenWeather rate limits (ideally 10-15 minutes between requests) to avoid throttling.

That's all you need to keep the display lightweight and entirely static on the frontend.
