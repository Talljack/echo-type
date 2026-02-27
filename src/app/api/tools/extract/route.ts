import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid URL' }, { status: 400 });
    }
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    const hostname = urlObj.hostname.replace('www.', '');
    const supportedPlatforms: Record<string, string> = {
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
      'bilibili.com': 'Bilibili',
      'b23.tv': 'Bilibili',
      'tiktok.com': 'TikTok',
      'twitter.com': 'Twitter/X',
      'x.com': 'Twitter/X',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
    };
    const platform = Object.entries(supportedPlatforms).find(([domain]) => hostname.includes(domain));
    if (!platform) {
      return NextResponse.json({
        error: `Unsupported platform: ${hostname}. Supported: YouTube, Bilibili, TikTok, Twitter/X, Facebook, Instagram`,
      }, { status: 400 });
    }
    return NextResponse.json({
      title: `${platform[1]} Import`,
      text: `Content extracted from ${platform[1]}. Full audio extraction requires yt-dlp to be installed on the server. Please install yt-dlp and ffmpeg for full functionality.`,
      platform: platform[1].toLowerCase(),
      sourceUrl: url,
    });
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}