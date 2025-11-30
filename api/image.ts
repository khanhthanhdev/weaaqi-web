import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const imagePath = join(process.cwd(), 'dist', 'image.png');
        
        if (!existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        const imageBuffer = readFileSync(imagePath);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=900'); // Cache for 15 minutes
        return res.send(imageBuffer);
    } catch (error) {
        console.error('Error serving image:', error);
        return res.status(500).json({ error: 'Failed to serve image' });
    }
}
