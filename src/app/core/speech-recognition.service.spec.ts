import { TestBed } from '@angular/core/testing';
import {
  SPEECH_RECOGNITION_CTOR,
  SpeechRecognitionService,
  mergeFinalSegments,
  type BrowserRecognition,
  type RecognitionConstructor,
} from './speech-recognition.service';
import { SettingsService } from './settings.service';

class MockRecognition implements BrowserRecognition {
  static instances: MockRecognition[] = [];
  static availability: string | undefined;
  static available?: RecognitionConstructor['available'];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  processLocally?: boolean;
  onresult: BrowserRecognition['onresult'] = null;
  onerror: BrowserRecognition['onerror'] = null;
  onend: BrowserRecognition['onend'] = null;
  started = 0;
  stopped = false;
  aborted = false;
  constructor() {
    MockRecognition.instances.push(this);
  }
  start(): void {
    this.started += 1;
  }
  stop(): void {
    this.stopped = true;
  }
  abort(): void {
    this.aborted = true;
  }
  emit(...parts: [string, boolean][]): void {
    const results = parts.map(([transcript, isFinal]) =>
      Object.assign([{ transcript }], { isFinal }),
    );
    this.onresult?.({ results: Object.assign(results, { length: results.length }) });
  }
}

function setup(options: { available?: string; online?: boolean } = {}) {
  MockRecognition.instances = [];
  localStorage.clear();
  const ctor = MockRecognition as unknown as RecognitionConstructor;
  MockRecognition.available =
    options.available === undefined
      ? undefined
      : () => Promise.resolve(options.available as string);
  TestBed.configureTestingModule({
    providers: [SpeechRecognitionService, { provide: SPEECH_RECOGNITION_CTOR, useValue: ctor }],
  });
  TestBed.inject(SettingsService).update({ onlineRecognition: options.online ?? true });
  return TestBed.inject(SpeechRecognitionService);
}

const last = () => MockRecognition.instances[MockRecognition.instances.length - 1];

describe('SpeechRecognitionService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is unsupported without a constructor', () => {
    TestBed.configureTestingModule({
      providers: [
        SpeechRecognitionService,
        { provide: SPEECH_RECOGNITION_CTOR, useValue: undefined },
      ],
    });
    const service = TestBed.inject(SpeechRecognitionService);
    expect(service.status()).toBe('unsupported');
    expect(service.supported).toBe(false);
  });

  it('streams interim and final results', async () => {
    const service = setup();
    expect(await service.start()).toBe(true);
    expect(service.status()).toBe('listening');
    expect(last().continuous).toBe(true);
    expect(last().interimResults).toBe(true);
    expect(last().lang).toBe('en-GB');

    last().emit(['hello there', false]);
    expect(service.interimTranscript()).toBe('hello there');
    expect(service.finalTranscript()).toBe('');

    last().emit(['hello there', true], [' how are', false]);
    expect(service.finalTranscript()).toBe('hello there');
    expect(service.interimTranscript()).toBe('how are');
  });

  it('restarts when the browser ends the session while still recording, keeping the text', async () => {
    const service = setup();
    await service.start();
    const first = last();
    first.emit(['I like music', true]);
    first.onend?.();
    await vi.advanceTimersByTimeAsync(300);
    expect(MockRecognition.instances).toHaveLength(2);
    expect(service.status()).toBe('listening');

    last().emit(['and sport', true]);
    expect(service.finalTranscript()).toBe('I like music and sport');
  });

  it('does not restart after stop()', async () => {
    const service = setup();
    await service.start();
    service.stop();
    expect(last().stopped).toBe(true);
    last().onend?.();
    await vi.advanceTimersByTimeAsync(1000);
    expect(MockRecognition.instances).toHaveLength(1);
    expect(service.status()).toBe('stopped');
  });

  it('ignores no-speech errors but fails on permission errors', async () => {
    const service = setup();
    await service.start();
    last().onerror?.({ error: 'no-speech' });
    expect(service.status()).toBe('listening');

    last().onerror?.({ error: 'not-allowed' });
    expect(service.status()).toBe('error');
    expect(service.error()).toContain('blocked');
    last().onend?.();
    await vi.advanceTimersByTimeAsync(1000);
    expect(MockRecognition.instances).toHaveLength(1);
  });

  it('gives up after too many restarts without any result', async () => {
    const service = setup();
    await service.start();
    for (let i = 0; i < 12 && service.status() === 'listening'; i += 1) {
      last().onend?.();
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(service.status()).toBe('error');
  });

  it('uses on-device recognition when available', async () => {
    const service = setup({ available: 'available', online: false });
    expect(await service.start()).toBe(true);
    expect(service.mode()).toBe('on-device');
    expect(last().processLocally).toBe(true);
  });

  it('offers a download when the on-device pack is downloadable', async () => {
    const service = setup({ available: 'downloadable', online: false });
    expect(await service.start()).toBe(false);
    expect(service.capability()).toBe('downloadable');
    expect(service.needsOnlinePermission()).toBe(true);
  });

  it('does not use online recognition unless the setting allows it', async () => {
    const service = setup({ online: false });
    expect(await service.start()).toBe(false);
    expect(service.needsOnlinePermission()).toBe(true);
    expect(MockRecognition.instances).toHaveLength(0);

    TestBed.inject(SettingsService).update({ onlineRecognition: true });
    expect(await service.start()).toBe(true);
    expect(service.mode()).toBe('online');
    expect(last().processLocally).toBeUndefined();
  });

  it('aborts the session on abort()', async () => {
    const service = setup();
    await service.start();
    service.abort();
    expect(MockRecognition.instances[0].aborted).toBe(true);
    expect(service.status()).toBe('stopped');
  });
});

describe('mergeFinalSegments', () => {
  it('joins segments and drops empty ones', () => {
    expect(mergeFinalSegments([' hello ', '', 'world'])).toBe('hello world');
  });
  it('removes repeated and cumulative segments (Chrome Android)', () => {
    expect(mergeFinalSegments(['I like', 'I like', 'I like football'])).toBe('I like football');
    expect(mergeFinalSegments(['I like football', 'and tennis'])).toBe(
      'I like football and tennis',
    );
  });
});
