'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The recitation, verse by verse.
 *
 * One file per verse from the Islamic Network CDN, addressed by the verse's
 * number in the whole Quran (1–6236). Played in order down the page; at the
 * foot of the page the reader is asked for the next one and playback carries
 * on at its first verse. The verse after the one playing is fetched ahead so
 * the gap between two is a breath, not a load.
 *
 * Nothing is fetched until somebody presses play: the page itself makes no
 * request to the CDN.
 */

export const RECITERS = ['alafasy', 'husary', 'minshawi'] as const;
export type Reciter = (typeof RECITERS)[number];
export const SPEEDS = [1, 1.25, 1.5, 0.75] as const;

export const audioUrl = (reciter: Reciter, global: number) =>
  `https://cdn.islamic.network/quran/audio/128/ar.${reciter}/${global}.mp3`;

export interface Track {
  /** The verse's number in the whole Quran. */
  global: number;
  /** What the lock screen calls it. */
  title: string;
}

export interface QuranAudio {
  /** Which verse of the page is loaded, or null before anything has played. */
  index: number | null;
  playing: boolean;
  buffering: boolean;
  time: number;
  duration: number;
  playAt: (index: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  /** Play this verse once the next page's tracks have arrived. */
  queue: (index: number) => void;
}

export function useQuranAudio({
  tracks,
  reciter,
  speed,
  artist,
  album,
  onPageEnd,
  onPageStart,
  onError,
}: {
  tracks: Track[];
  reciter: Reciter;
  speed: number;
  artist: string;
  album: string;
  /** Called after the last verse of the page; the reader turns the page. */
  onPageEnd: () => void;
  /** Called before the first verse when going back; the reader turns back. */
  onPageStart: () => void;
  onError: () => void;
}): QuranAudio {
  const audio = useRef<HTMLAudioElement | null>(null);
  const ahead = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The handlers below are bound once; they read the latest of these.
  const live = useRef({ tracks, index, reciter, speed, onPageEnd, onPageStart, onError });
  live.current = { tracks, index, reciter, speed, onPageEnd, onPageStart, onError };
  const queued = useRef<number | null>(null);

  const element = useCallback(() => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.preload = 'auto';
    }
    return audio.current;
  }, []);

  const playAt = useCallback(
    (at: number) => {
      const { tracks: list, reciter: voice, speed: rate } = live.current;
      const track = list[at];
      if (!track) return;
      const el = element();
      const src = audioUrl(voice, track.global);
      if (el.src !== src) {
        el.src = src;
        setTime(0);
        setDuration(0);
      }
      el.playbackRate = rate;
      setIndex(at);
      setBuffering(true);
      el.play().catch((error: DOMException) => {
        // A newer play() or a pause() interrupting this one is not a failure.
        if (error?.name === 'AbortError') return;
        setBuffering(false);
        setPlaying(false);
        if (error?.name !== 'NotAllowedError') live.current.onError();
      });
      // The one after, so it is in the cache before it is wanted.
      const following = list[at + 1];
      if (following) {
        ahead.current ??= new Audio();
        ahead.current.preload = 'auto';
        ahead.current.src = audioUrl(voice, following.global);
      }
    },
    [element],
  );

  const next = useCallback(() => {
    const { index: at, tracks: list } = live.current;
    const from = at ?? -1;
    if (from + 1 < list.length) playAt(from + 1);
    else {
      queued.current = 0;
      live.current.onPageEnd();
    }
  }, [playAt]);

  const previous = useCallback(() => {
    const { index: at } = live.current;
    const el = audio.current;
    // As players do: back to the start of this verse first, then the one before.
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    if (at !== null && at > 0) playAt(at - 1);
    else if (at === 0) {
      queued.current = -1;
      live.current.onPageStart();
    }
  }, [playAt]);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (live.current.index === null || !el?.src) {
      playAt(0);
      return;
    }
    if (el.paused) {
      setBuffering(true);
      el.play().catch(() => {
        setBuffering(false);
        live.current.onError();
      });
    } else el.pause();
  }, [playAt]);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration, seconds));
    setTime(el.currentTime);
  }, []);

  const queue = useCallback((at: number) => {
    queued.current = at;
  }, []);

  // A new page: carry on into it if that was asked for, otherwise stop —
  // the verse that was loaded belongs to the page that has gone.
  const first = tracks[0]?.global;
  useEffect(() => {
    const want = queued.current;
    queued.current = null;
    if (want !== null) {
      playAt(want < 0 ? live.current.tracks.length - 1 : want);
      return;
    }
    if (live.current.index !== null) {
      audio.current?.pause();
      setIndex(null);
      setTime(0);
      setDuration(0);
    }
  }, [first, playAt]);

  // The element's own events.
  useEffect(() => {
    const el = element();
    const onPlaying = () => {
      setBuffering(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onTime = () => setTime(el.currentTime);
    const onDuration = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onEnded = () => next();
    const onFail = () => {
      if (!el.src) return;
      setBuffering(false);
      setPlaying(false);
      live.current.onError();
    };
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('durationchange', onDuration);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onFail);
    return () => {
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('durationchange', onDuration);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onFail);
    };
  }, [element, next]);

  // Leaving the page stops the voice.
  useEffect(
    () => () => {
      audio.current?.pause();
      if (audio.current) audio.current.src = '';
    },
    [],
  );

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);

  // Another reciter: the same verse, in the new voice, if one was playing.
  useEffect(() => {
    const at = live.current.index;
    if (at === null || !audio.current || audio.current.paused) return;
    playAt(at);
  }, [reciter, playAt]);

  /* ── The lock screen ─────────────────────────────────────────────────── */
  const title = index !== null ? tracks[index]?.title : undefined;
  useEffect(() => {
    if (!('mediaSession' in navigator) || !title) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album });
    } catch {
      /* not supported */
    }
  }, [title, artist, album]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* this action is not supported here */
      }
    };
    set('play', () => toggle());
    set('pause', () => audio.current?.pause());
    set('previoustrack', () => previous());
    set('nexttrack', () => next());
    set('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
    return () => {
      for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const) {
        set(action, null);
      }
    };
  }, [toggle, previous, next, seek]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : index === null ? 'none' : 'paused';
  }, [playing, index]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(time, duration),
        playbackRate: speed,
      });
    } catch {
      /* not supported */
    }
  }, [time, duration, speed]);

  return { index, playing, buffering, time, duration, playAt, toggle, next, previous, seek, queue };
}
