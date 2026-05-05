import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { StreamClient } from '@stream-io/node-sdk';

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, sessionId, filename, type } = await request.json();

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json({ error: 'Stream credentials not configured' }, { status: 500 });
    }

    const client = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET, {
      timeout: 30000,
    });

    // Use a system-level call object to ensure admin rights
    const call = client.video.call('default', callId);

    if (type === 'recording') {
      let effectiveSessionId = sessionId;
      if (!effectiveSessionId && filename) {
        const parts = filename.split('_');
        if (parts.length >= 3) effectiveSessionId = parts[2];
      }

      if (!effectiveSessionId || !filename) {
        return NextResponse.json({ error: 'Session ID and filename required' }, { status: 400 });
      }

      try {
        await call.deleteRecording({ session: effectiveSessionId, filename: filename });
      } catch (err: any) {
        if (err.message?.includes("doesn't exist") || err.code === 16) {
          console.log(`[API] Recording already deleted: ${filename}`);
        } else {
          throw err;
        }
      }
      return NextResponse.json({ message: 'Recording deleted permanently' });
    } else {
      console.log(`[API] Admin deleting call: ${callId}`);
      // Use the standard delete method on the administrative call object
      await call.delete();
      return NextResponse.json({ message: 'Meeting deleted permanently' });
    }
  } catch (error) {
    console.error('Error in delete API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
