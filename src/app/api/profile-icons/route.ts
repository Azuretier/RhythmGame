import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'profile_image');

    if (!fs.existsSync(dir)) {
      return NextResponse.json({ icons: [] });
    }

    const files = fs.readdirSync(dir);
    const imageFiles = files
      .filter((f) => /\.(png|jpe?g|gif|jfif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b));

    const icons = imageFiles.map((filename) => ({
      id: filename.replace(/\.(png|jpe?g|gif|jfif)$/i, ''),
      filename,
      src: `/profile_image/${filename}`,
    }));

    return NextResponse.json({ icons });
  } catch (error) {
    console.error('[PROFILE_ICONS] Error scanning directory:', error);
    return NextResponse.json({ icons: [] });
  }
}
