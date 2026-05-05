import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { StreamClient } from '@stream-io/node-sdk';
import { generateSummaryWithGroq } from '@/lib/aiService';
import { transcribeWithSpeakerDiarization } from '@/lib/assemblyaiService';

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

async function getStreamClient(): Promise<StreamClient | null> {
  if (!STREAM_API_KEY || !STREAM_API_SECRET) {
    console.warn('STREAM_API_KEY or STREAM_API_SECRET not configured');
    return null;
  }
  return new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);
}

function parseJSONL(jsonlContent: string, memberMap: Map<string, string>, clerkUser?: any): string {
  const lines = jsonlContent.split('\n').filter(line => line.trim());
  const result: string[] = [];
  console.log('[JSONL] Total lines to parse:', lines.length);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const speakerId = entry.speaker_id || entry.user_id || entry.user?.id || entry.speaker || 'Unknown';
      let speakerName = memberMap.get(speakerId) || entry.user?.name || speakerId;

      // Fuzzy check for current user
      if (speakerName === speakerId && clerkUser && speakerId.includes(clerkUser.id)) {
        speakerName = clerkUser.username || clerkUser.fullName || clerkUser.firstName || clerkUser.id;
      }

      const text = entry.text || entry.content || entry.transcript || '';
      if (text.trim()) {
        result.push(`${speakerName}: ${text.trim()}`);
      }
    } catch {
      // skip malformed lines
    }
  }
  console.log('[JSONL] Parsed', result.length, 'utterances');
  return result.join('\n');
}

async function getCallMemberMap(callId: string): Promise<Map<string, string>> {
  const memberMap = new Map<string, string>();
  const streamClient = await getStreamClient();
  if (!streamClient) return memberMap;

  console.log(`[Stream] Attempting to resolve names for callId: ${callId}`);

  try {
    const call = streamClient.video.call('default', callId);
    const response = await call.get();

    // 1. Check active session participants
    const participants = response.call.session?.participants || [];
    for (const p of participants) {
      if (p.user?.id) {
        memberMap.set(p.user.id, p.user.name || p.user.id);
      }
    }

    // 2. Check call members from state
    const callMembers = (response as any).members || [];
    for (const m of callMembers) {
      if (m.user?.id && !memberMap.has(m.user.id)) {
        memberMap.set(m.user.id, m.user.name || m.user.id);
      }
    }

    // 3. Deep query members (especially for past/archived calls)
    try {
      const queryResponse = await call.queryMembers({});
      const queriedMembers = queryResponse.members || [];
      for (const m of queriedMembers) {
        if (m.user?.id && !memberMap.has(m.user.id)) {
          memberMap.set(m.user.id, m.user.name || m.user.id);
        }
      }
    } catch (queryErr) {
      console.warn('[Stream] queryMembers failed:', queryErr);
    }

    console.log(`[Stream] Resolved ${memberMap.size} unique users. Keys:`, Array.from(memberMap.keys()));
    console.log(`[Stream] Name mapping:`, Object.fromEntries(memberMap));
  } catch (error) {
    console.warn('[Stream] Failed to fetch call data for name resolution:', error);
  }

  return memberMap;
}

async function getLatestTranscriptionJSONL(callId: string): Promise<string> {
  const streamClient = await getStreamClient();
  if (!streamClient) {
    throw new Error('Stream client not configured. Check STREAM_API_KEY and STREAM_API_SECRET.');
  }

  console.log('[Stream] Listing transcriptions for callId:', callId);

  try {
    const transcriptionsResponse = await (streamClient.video as any).listTranscriptions({
      type: 'default',
      id: callId,
    });

    const transcriptions = (transcriptionsResponse as any)?.transcriptions || [];
    console.log(`[Stream] Found ${transcriptions.length} transcriptions`);

    if (transcriptions.length === 0) {
      console.log('[Fallback] No Stream transcription found, falling back to AssemblyAI');
      throw new Error('NO_STREAM_TRANSCRIPTION');
    }

    const latestTranscription = transcriptions[transcriptions.length - 1];
    console.log('[Stream] Latest transcription:', latestTranscription);

    const fileUrl = latestTranscription?.url || latestTranscription?.file_url || latestTranscription?.jsonl_url;
    if (!fileUrl) {
      throw new Error('No transcription file URL found');
    }

    console.log('[Stream] Downloading JSONL from:', fileUrl.substring(0, 100));

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download transcription: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const fileContent = await fileResponse.text();
    console.log('[Stream] JSONL downloaded, length:', fileContent.length);
    console.log('[Stream] Raw file content:', fileContent.substring(0, 800));

    return fileContent;
  } catch (error) {
    console.error('[Stream] Error fetching transcription:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }

    const { recordingUrl, recordingId, callId } = body;

    console.log('[API] Parsed request body:', { recordingUrl: recordingUrl?.substring(0, 50), recordingId: recordingId?.substring(0, 50), callId });

    if (!recordingUrl) {
      return NextResponse.json(
        { error: 'Recording URL is required' },
        { status: 400 }
      );
    }

    if (!callId) {
      console.warn('[API] No callId provided in request body. Cannot map speakers to real usernames.');
    } else {
      console.log('[API] callId received:', callId);
    }

    console.log('Starting summarization for recording:', recordingUrl.substring(0, 100));

    const summary = await generateSummary(recordingUrl, callId, user);

    return NextResponse.json({
      summary,
      recordingId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/summarize:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to summarize meeting';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

async function generateSummary(recordingUrl: string, callId: string | undefined, clerkUser: any): Promise<string> {
  if (!callId) {
    throw new Error('callId is required for transcription-based summarization');
  }

  let formattedTranscript: string;

  try {
    console.log('=== Step 1: Get transcription JSONL from Stream ===');
    const jsonlContent = await getLatestTranscriptionJSONL(callId);

    console.log('=== Step 1.5: Resolve participant names ===');
    const memberMap = await getCallMemberMap(callId);

    // 1.6: Force current user's name into map as final guarantee
    if (clerkUser) {
      const preferredName = clerkUser.username || clerkUser.fullName || clerkUser.firstName || clerkUser.id;
      memberMap.set(clerkUser.id, preferredName);
      console.log(`[API] Guaranteed mapping: ${clerkUser.id} -> ${preferredName}`);
    }

    console.log('=== Step 2: Parse JSONL file ===');
    formattedTranscript = parseJSONL(jsonlContent, memberMap, clerkUser);

    if (formattedTranscript.length === 0) {
      throw new Error('No speech content found in transcription');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('NO_STREAM_TRANSCRIPTION')) {
      console.log('[Fallback] Using AssemblyAI for transcription...');
      const utterances = await transcribeWithSpeakerDiarization(recordingUrl, 2);

      if (utterances.length === 0) {
        throw new Error('No speech detected in the recording');
      }

      // Format AssemblyAI utterances as transcript lines
      const lines: string[] = [];
      for (const utterance of utterances) {
        lines.push(`Speaker ${utterance.speaker}: ${utterance.text}`);
      }
      formattedTranscript = lines.join('\n');
    } else {
      throw error;
    }
  }

  console.log('Formatted transcript preview:');
  console.log(formattedTranscript.substring(0, 500) + '...');

  console.log('=== Step 3: Summarize with Groq ===');
  const summary = await generateSummaryWithGroq(formattedTranscript);

  console.log('Summary generated successfully');
  return summary;
}

