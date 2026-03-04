import { useState, useRef, useEffect, useCallback } from 'react';
import { IconPlay, IconPause } from '@/components/icons';

const BUFFER_THRESHOLD_SEC = 3;

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getBufferedAhead(audio) {
  if (!audio || audio.buffered.length === 0) return 0;
  const t = audio.currentTime;
  for (let i = 0; i < audio.buffered.length; i++) {
    if (audio.buffered.start(i) <= t && t <= audio.buffered.end(i)) {
      return audio.buffered.end(i) - t;
    }
  }
  return 0;
}

/**
 * 녹음 재생 플레이어 (버퍼링 후 재생)
 * audioRef를 통해 부모에서 seek 등 제어 가능
 */
export default function RecordingPlayer({ audioUrl = '', audioRef }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const internalRef = useRef(null);
  const bufferCheckRef = useRef(null);
  const ref = audioRef ?? internalRef;

  const tryStartPlay = useCallback(() => {
    const audio = ref.current;
    if (!audio) return;

    const cleanup = () => {
      audio.removeEventListener('progress', check);
      audio.removeEventListener('canplay', check);
      audio.removeEventListener('canplaythrough', check);
      if (bufferCheckRef.current) {
        clearInterval(bufferCheckRef.current);
        bufferCheckRef.current = null;
      }
    };

    const check = () => {
      if (getBufferedAhead(audio) >= BUFFER_THRESHOLD_SEC || audio.readyState >= 4) {
        cleanup();
        setIsBuffering(false);
        audio.play();
      }
    };

    const buffered = getBufferedAhead(audio);
    if (buffered >= BUFFER_THRESHOLD_SEC || audio.readyState >= 4) {
      audio.play();
      return;
    }

    setIsBuffering(true);
    audio.addEventListener('progress', check);
    audio.addEventListener('canplay', check, { once: true });
    audio.addEventListener('canplaythrough', check, { once: true });
    bufferCheckRef.current = setInterval(check, 200);
    audio.addEventListener('error', cleanup, { once: true });
  }, [ref]);

  const handlePlayPause = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) {
      tryStartPlay();
    } else {
      audio.pause();
    }
  };

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (audio.duration && !Number.isNaN(audio.duration)) setDuration(audio.duration);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [ref]);

  useEffect(() => {
    if (!audioUrl) return;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
    if (bufferCheckRef.current) {
      clearInterval(bufferCheckRef.current);
      bufferCheckRef.current = null;
    }
  }, [audioUrl]);

  if (!audioUrl) return null;

  return (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <audio ref={ref} src={audioUrl} preload="auto" className="hidden" />
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={isBuffering}
        className="shrink-0 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white flex items-center justify-center transition-colors"
        title={isBuffering ? '버퍼링 중...' : isPlaying ? '일시정지' : '재생'}
      >
        {isBuffering ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <IconPause size={16} />
        ) : (
          <IconPlay size={16} />
        )}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-xs text-gray-600 dark:text-odp-muted shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="flex-1 min-w-0 h-1 bg-gray-200 dark:bg-odp-borderSoft rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-150"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}
