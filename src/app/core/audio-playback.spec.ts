import type { Recording } from '../models/exam';
import { scriptFingerprint } from './audio-clips.service';
import { FilePlayback, type AudioLike } from './audio-playback';

const recording: Recording = {
  speakers: [
    { id: 'a', name: 'Ann', voice: { lang: 'en-GB' } },
    { id: 'b', name: 'Ben', voice: { lang: 'en-US' } },
  ],
  turns: [
    { speaker: 'a', text: 'First.' },
    { speaker: 'b', text: 'Second.' },
    { speaker: 'a', text: 'Third.' },
  ],
};

class FakeAudio implements AudioLike {
  src = '';
  preload = '';
  currentTime = 0;
  playbackRate = 1;
  playing = false;
  rejectPlay = false;
  private listeners: Record<string, () => void> = {};
  play(): Promise<void> {
    this.playing = true;
    return this.rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve();
  }
  pause(): void {
    this.playing = false;
  }
  addEventListener(type: string, listener: () => void): void {
    this.listeners[type] = listener;
  }
  emit(type: string): void {
    this.listeners[type]?.();
  }
}

function setup(rate = 1) {
  const audio = new FakeAudio();
  const failed = vi.fn();
  const playback = new FilePlayback(
    recording,
    'audio/b1/x/e/r01.opus',
    [0, 4, 9],
    () => rate,
    failed,
    () => audio,
  );
  return { audio, failed, playback };
}

describe('FilePlayback', () => {
  it('loads nothing until it plays and applies the speech rate', () => {
    const { audio, playback } = setup(0.8);
    expect(audio.preload).toBe('none');
    expect(audio.src).toBe('audio/b1/x/e/r01.opus');
    playback.restart();
    expect(audio.playing).toBe(true);
    expect(audio.playbackRate).toBe(0.8);
    expect(playback.state()).toBe('playing');
  });

  it('follows the turn from the play position', () => {
    const { audio, playback } = setup();
    playback.restart();
    audio.currentTime = 4.5;
    audio.emit('timeupdate');
    expect(playback.turn()).toBe(1);
    expect(playback.speakerId).toBe('b');
    audio.currentTime = 9;
    audio.emit('timeupdate');
    expect(playback.turn()).toBe(2);
  });

  it('pauses, resumes and repeats the current turn', () => {
    const { audio, playback } = setup();
    playback.restart();
    audio.currentTime = 6;
    audio.emit('timeupdate');
    playback.pause();
    expect(playback.state()).toBe('paused');
    expect(audio.playing).toBe(false);
    playback.resume();
    expect(playback.state()).toBe('playing');
    expect(audio.currentTime).toBe(6);
    playback.repeatTurn();
    expect(audio.currentTime).toBe(4);
  });

  it('ends on the last turn and goes back to idle on stop', () => {
    const { audio, playback } = setup();
    playback.restart();
    audio.emit('ended');
    expect(playback.state()).toBe('ended');
    expect(playback.turn()).toBe(2);
    playback.stop();
    expect(playback.state()).toBe('idle');
    expect(playback.turn()).toBe(0);
    expect(audio.currentTime).toBe(0);
  });

  it('reports a file that cannot be played so the caller can fall back', async () => {
    const { audio, failed, playback } = setup();
    audio.rejectPlay = true;
    playback.restart();
    await Promise.resolve();
    await Promise.resolve();
    expect(playback.state()).toBe('failed');
    expect(failed).toHaveBeenCalledOnce();
    audio.emit('error');
    expect(failed).toHaveBeenCalledTimes(2);
  });
});

describe('scriptFingerprint', () => {
  it('matches the value of tools/tts/catalog.py', () => {
    const rec: Recording = {
      speakers: [],
      turns: [{ speaker: 'a', text: 'Café, it’s ok.' }],
    };
    expect(scriptFingerprint(rec)).toBe('fbde8f34');
  });

  it('changes when the script changes', () => {
    const changed: Recording = {
      ...recording,
      turns: [...recording.turns.slice(0, 2), { speaker: 'a', text: 'Third!' }],
    };
    expect(scriptFingerprint(changed)).not.toBe(scriptFingerprint(recording));
  });
});
