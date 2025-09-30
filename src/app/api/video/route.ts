import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@replit/object-storage';

export async function GET(request: NextRequest) {
  try {
    const client = new Client();
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file') || 'intro-video.mp4';
    
    // Download the video file from App Storage
    const result = await client.downloadAsBytes(filename);
    
    if (!result.ok) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoBuffer = result.value[0];
    const fileSize = videoBuffer.length;
    const range = request.headers.get('range');

    // If no range header, return entire file
    if (!range) {
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    
    // Extract the requested chunk
    const chunk = videoBuffer.slice(start, end + 1);

    return new NextResponse(chunk, {
      status: 206, // Partial Content
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
}