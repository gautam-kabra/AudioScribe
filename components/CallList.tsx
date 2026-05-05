'use client';

import { Call, CallRecording } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

import Loader from './Loader';
import { useGetCalls } from '@/hooks/useGetCalls';
import MeetingCard from './MeetingCard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ui/use-toast';

const CallList = ({ type }: { type: 'ended' | 'upcoming' | 'recordings' }) => {
  const router = useRouter();
  const { user } = useUser();
  const { endedCalls, upcomingCalls, callRecordings, isLoading } =
    useGetCalls();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const { toast } = useToast();

  const getCalls = () => {
    switch (type) {
      case 'ended':
        return endedCalls;
      case 'recordings':
        return recordings;
      case 'upcoming':
        return upcomingCalls;
      default:
        return [];
    }
  };

  const getNoCallsMessage = () => {
    switch (type) {
      case 'ended':
        return 'No Previous Calls';
      case 'upcoming':
        return 'No Upcoming Calls';
      case 'recordings':
        return 'No Recordings';
      default:
        return '';
    }
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const callData = await Promise.all(
          callRecordings?.map((meeting) => meeting.queryRecordings()) ?? [],
        );

        const recordings = callData
          .filter((call) => call.recordings.length > 0)
          .flatMap((call, index) => {
            const meeting = callRecordings?.[index];
            const title = meeting?.state?.custom?.description?.substring(0, 20) || 'No Description';
            const callId = meeting?.id;
            
            // Map members to plain objects to avoid immutable proxy errors
            const participants = meeting?.state?.members?.map(m => ({
              image: m.user.image,
              name: m.user.name || m.user.id
            })) || [];

            return call.recordings.map(recording => ({
              // Use Object.assign or explicit mapping to avoid proxy issues
              url: recording.url,
              filename: recording.filename,
              start_time: recording.start_time,
              end_time: recording.end_time,
              session_id: recording.session_id,
              title: title,
              callId: callId,
              participants: participants
            }));
          });

        setRecordings(recordings as any);
      } catch (error) {
        console.error(error);
        toast({ title: 'Try again later' });
      }
    };

    if (type === 'recordings') {
      fetchRecordings();
    }
  }, [type, callRecordings]);

  if (isLoading) return <Loader />;

  const calls = getCalls();
  const noCallsMessage = getNoCallsMessage();

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {calls && calls.length > 0 ? (
        calls.map((meeting: Call | CallRecording) => (
          <MeetingCard
            key={(meeting as Call).id || (meeting as CallRecording).url}
            icon={
              type === 'ended'
                ? '/icons/previous.svg'
                : type === 'upcoming'
                  ? '/icons/upcoming.svg'
                  : '/icons/recordings.svg'
            }
            title={
              (meeting as Call).state?.custom?.description ||
              (meeting as any).title || // Use enriched title
              (meeting as CallRecording).filename?.substring(0, 20) ||
              'No Description'
            }
            date={
              (meeting as Call).state?.startsAt
                ? new Date((meeting as Call).state!.startsAt!).toLocaleString(
                  'en-IN',
                  {
                    timeZone: 'Asia/Kolkata',
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )
                : (meeting as CallRecording).start_time
                  ? new Date((meeting as CallRecording).start_time).toLocaleString(
                    'en-IN',
                    {
                      timeZone: 'Asia/Kolkata',
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )
                  : 'Date not available'
            }
            isPreviousMeeting={type === 'ended'}
            link={
              type === 'recordings'
                ? (meeting as CallRecording).url
                : `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${(meeting as Call).id}`
            }
            buttonIcon1={type === 'recordings' ? '/icons/play.svg' : undefined}
            buttonText={type === 'recordings' ? 'Play' : 'Start'}
            handleClick={
              type === 'recordings'
                ? () => router.push(`${(meeting as CallRecording).url}`)
                : () => router.push(`/meeting/${(meeting as Call).id}`)
            }
            isRecording={type === 'recordings'}
            recordingId={
              type === 'recordings'
                ? (meeting as CallRecording).url
                : undefined
            }
            callId={
              type === 'recordings'
                ? (meeting as any).callId || (meeting as any).call_id
                : (meeting as Call).id
            }
            sessionId={
              type === 'recordings'
                ? (meeting as any).session_id
                : undefined
            }
            filename={
              type === 'recordings'
                ? (meeting as any).filename
                : undefined
            }
            onDelete={() => {
              if (type === 'recordings') {
                setRecordings(prev => prev.filter(r => (r as any).url !== (meeting as any).url));
              } else {
                // For calls, we might need to refresh the useGetCalls data
                // but since we can't easily force it, we can just reload or toast
                router.refresh();
              }
            }}
            participants={
              (() => {
                const parts = type === 'recordings'
                  ? (meeting as any).participants
                  : (meeting as Call).state?.members?.map(m => ({
                      image: m.user.image,
                      name: m.user.name || m.user.id
                    }));
                
                // Fallback to current user if no participants found
                if ((!parts || parts.length === 0) && user) {
                  return [{
                    image: user.imageUrl,
                    name: user.username || user.fullName || user.id
                  }];
                }
                return parts;
              })()
            }
          />
        ))
      ) : (
        <h1 className="text-2xl font-bold text-white">{noCallsMessage}</h1>
      )}
    </div>
  );
};

export default CallList;
