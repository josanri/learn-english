import type { Recording, Speaker } from '../models/exam';
import {
  ScriptPlayback,
  chooseVoices,
  splitIntoChunks,
  type PlaybackEnv,
  type UtteranceLike,
} from './speech-playback';

const voice = (name: string, lang = 'en-GB'): SpeechSynthesisVoice =>
  ({ name, lang, voiceURI: name, localService: true, default: false }) as SpeechSynthesisVoice;

const speaker = (id: string, gender?: 'female' | 'male'): Speaker => ({
  id,
  name: id,
  voice: { lang: 'en-GB', gender },
});

describe('splitIntoChunks', () => {
  it('splits at sentence ends and keeps short text whole', () => {
    expect(splitIntoChunks('Hello there.')).toEqual(['Hello there.']);
    expect(splitIntoChunks('First one. Second one! Third?')).toEqual([
      'First one.',
      'Second one!',
      'Third?',
    ]);
  });

  it('does not break times and decimals', () => {
    expect(splitIntoChunks('Meet at 10.30 outside.')).toEqual(['Meet at 10.30 outside.']);
  });

  it('breaks long sentences at commas or spaces under the limit', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ') + ', end';
    const chunks = splitIntoChunks(long, 80);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.length <= 80)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });

  it('returns nothing for empty text', () => {
    expect(splitIntoChunks('   ')).toEqual([]);
  });
});

describe('chooseVoices', () => {
  const voices = [
    voice('Microsoft Hazel - English (United Kingdom)'),
    voice('Microsoft George - English (United Kingdom)'),
    voice('Google US English', 'en-US'),
    voice('Amelie', 'fr-FR'),
  ];

  it('gives each speaker a different voice of the right gender when possible', () => {
    const map = chooseVoices([speaker('a', 'female'), speaker('b', 'male')], voices, null);
    expect(map.get('a')?.voice?.name).toContain('Hazel');
    expect(map.get('b')?.voice?.name).toContain('George');
    expect(map.get('a')?.pitch).toBe(1);
  });

  it('uses the preferred voice for the first speaker only', () => {
    const map = chooseVoices([speaker('a'), speaker('b')], voices, 'Google US English');
    expect(map.get('a')?.voice?.name).toBe('Google US English');
    expect(map.get('b')?.voice?.name).not.toBe('Google US English');
  });

  it('shifts pitch when speakers must share a single voice', () => {
    const map = chooseVoices([speaker('a', 'female'), speaker('b', 'male')], [voices[0]], null);
    expect(map.get('a')?.pitch).toBe(1);
    expect(map.get('b')?.pitch).toBeLessThan(1);
  });

  it('works with one speaker and with no voices', () => {
    expect(chooseVoices([speaker('a')], voices, null).get('a')?.voice).toBeDefined();
    expect(chooseVoices([speaker('a')], [], null).get('a')?.voice).toBeUndefined();
  });

  it('never picks a non-English voice', () => {
    const map = chooseVoices([speaker('a'), speaker('b'), speaker('c')], voices, null);
    for (const choice of map.values()) expect(choice.voice?.lang.startsWith('en')).toBe(true);
  });
});

/** A synth that ends each utterance after a short delay, like a quick engine. */
function fakeEnv(options: { failWith?: string; neverEnd?: boolean } = {}) {
  const spoken: UtteranceLike[] = [];
  let current: UtteranceLike | undefined;
  let speaking = false;
  const env: PlaybackEnv = {
    synth: {
      speak(u) {
        const utterance = u as unknown as UtteranceLike;
        spoken.push(utterance);
        current = utterance;
        speaking = true;
        if (options.neverEnd) return;
        setTimeout(() => {
          if (current !== utterance) return;
          speaking = false;
          if (options.failWith) utterance.onerror?.({ error: options.failWith });
          else utterance.onend?.({});
        }, 100);
      },
      cancel() {
        const was = current;
        current = undefined;
        speaking = false;
        // Chrome reports an error for cancelled speech; the player must ignore it.
        was?.onerror?.({ error: 'interrupted' });
      },
    },
    createUtterance: (text) => ({
      text,
      lang: '',
      rate: 1,
      pitch: 1,
      voice: null,
      onend: null,
      onerror: null,
    }),
    voices: () => [voice('Hazel'), voice('George')],
    rate: () => 1,
    voiceUri: () => null,
    busy: () => speaking,
  };
  return { env, spoken };
}

const recording: Recording = {
  speakers: [speaker('a', 'female'), speaker('b', 'male')],
  turns: [
    { speaker: 'a', text: 'Are we still meeting at the cafe? It is closed today.' },
    { speaker: 'b', text: 'Then let us meet outside the bookshop.' },
  ],
};

describe('ScriptPlayback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('speaks turn by turn with the voice of each speaker and ends', async () => {
    const { env, spoken } = fakeEnv();
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    expect(playback.state()).toBe('playing');
    await vi.advanceTimersByTimeAsync(1000);
    expect(playback.state()).toBe('ended');
    expect(spoken.map((u) => u.text)).toEqual([
      'Are we still meeting at the cafe?',
      'It is closed today.',
      'Then let us meet outside the bookshop.',
    ]);
    expect(spoken[0].voice?.name).toBe('Hazel');
    expect(spoken[2].voice?.name).toBe('George');
  });

  it('works for a single-speaker recording', async () => {
    const { env, spoken } = fakeEnv();
    const single: Recording = {
      speakers: [speaker('only')],
      turns: [{ speaker: 'only', text: 'One voice. Two sentences.' }],
    };
    const playback = new ScriptPlayback(single, env);
    playback.restart();
    await vi.advanceTimersByTimeAsync(1000);
    expect(spoken).toHaveLength(2);
    expect(playback.state()).toBe('ended');
  });

  it('pauses by cancelling and resumes from the current chunk', async () => {
    const { env, spoken } = fakeEnv();
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    await vi.advanceTimersByTimeAsync(150); // first chunk done, second started
    playback.pause();
    expect(playback.state()).toBe('paused');
    const count = spoken.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(spoken.length).toBe(count); // nothing more is spoken while paused
    playback.resume();
    await vi.advanceTimersByTimeAsync(1000);
    expect(spoken[count].text).toBe(spoken[count - 1].text); // the interrupted chunk is repeated
    expect(playback.state()).toBe('ended');
  });

  it('repeats the current turn from its first sentence', async () => {
    const { env, spoken } = fakeEnv();
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    await vi.advanceTimersByTimeAsync(150);
    expect(playback.turn()).toBe(0);
    playback.repeatTurn();
    await vi.advanceTimersByTimeAsync(100);
    expect(spoken.filter((u) => u.text === 'Are we still meeting at the cafe?').length).toBe(2);
  });

  it('reports failure when the engine errors and ignores cancellation errors', async () => {
    const { env } = fakeEnv({ failWith: 'synthesis-failed' });
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    await vi.advanceTimersByTimeAsync(300);
    expect(playback.state()).toBe('failed');
  });

  it('moves on when the engine never fires the end event', async () => {
    const { env, spoken } = fakeEnv({ neverEnd: true });
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(spoken.length).toBe(3);
    expect(playback.state()).toBe('ended');
  });

  it('stop returns to idle', async () => {
    const { env } = fakeEnv();
    const playback = new ScriptPlayback(recording, env);
    playback.restart();
    playback.stop();
    expect(playback.state()).toBe('idle');
    expect(playback.turn()).toBe(0);
  });
});
