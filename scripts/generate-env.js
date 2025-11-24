#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
    const repoRoot = path.resolve('.');
    const envPath = path.join(repoRoot, '.env');
    const targetPath = path.join(repoRoot, 'env-config.js');

    const envContent = await fs.readFile(envPath, 'utf8');
    const envEntries = parseEnv(envContent);
    const apiKey = envEntries.WEATHER_API_KEY || '';

    const fileContent = [
        "const OPENWEATHER_API_KEY = " + JSON.stringify(apiKey) + ";",
        "window.OPENWEATHER_API_KEY = OPENWEATHER_API_KEY;",
        "export { OPENWEATHER_API_KEY };",
        "export default OPENWEATHER_API_KEY;"
    ].join('\n') + '\n';

    await fs.writeFile(targetPath, fileContent, 'utf8');
    console.log('env-config.js generated (gitignored)');
}

function parseEnv(content) {
    const entries = {};
    content.split(/\\r?\\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...rest] = trimmed.split('=');
        entries[key] = rest.join('=').trim();
    });
    return entries;
}

main().catch(error => {
    console.error('Failed to generate env-config.js', error);
    process.exit(1);
});
