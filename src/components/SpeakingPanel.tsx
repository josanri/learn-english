import { useState } from 'react';
import type { SpeakingImagePrompt, SpeakingPart } from '../types/exam';
import { SPEAKING_PART_LABELS } from '../constants/app';
import { useSpeakingCapture } from '../hooks/useSpeakingCapture';

type Answers = Record<string, string | number>;
type SpeakingPrompt = { id: string; prompt: string; image?: SpeakingImagePrompt };

export function SpeakingPanel({
  examId,
  part,
  answers,
  onAnswer,
  allowOnlineRecognition,
  onOnlineRecognitionChange,
}: {
  examId: string;
  part: SpeakingPart;
  answers: Answers;
  onAnswer: (id: string, value: string) => void;
  allowOnlineRecognition: boolean;
  onOnlineRecognitionChange: (enabled: boolean) => void;
}) {
  const prompts = getSpeakingPrompts(part);
  return <>
    <div className="section-heading-paper"><div className="part-kicker">SPEAKING · PART {part.part}</div></div>
    <div className="speaking-title-row"><div><span className="speaking-format">{SPEAKING_PART_LABELS[part.type]}</span><h2>{part.title}</h2></div><span className="speaking-time">{part.part === 2 ? '1 minute' : part.part === 3 ? '2–3 minutes' : '20–30 seconds each'}</span></div>
    <p className="instructions">{part.instructions}</p>
    {part.prompt && <div className="speaking-task"><span>YOUR TASK</span><p>{part.prompt}</p></div>}
    <div className="speaking-privacy">
      <strong className="recognition-title">Live speech-to-text</strong>
      <p>Start recording to save your answer in this browser. If the transcript stays empty, enable online recognition below and record again. Some browsers do not provide speech recognition.</p>
      <label><input type="checkbox" checked={allowOnlineRecognition} onChange={event => onOnlineRecognitionChange(event.target.checked)} />
        <span><strong>Allow online speech recognition if on-device recognition is unavailable</strong><small>The browser may send speech to its recognition service. Your audio recording itself is saved only in this browser. Turn this on before you start speaking.</small></span>
      </label>
    </div>
    <div className="speaking-prompts">
      {prompts.map((prompt, index) => <SpeakingResponseCard
        key={prompt.id}
        examId={examId}
        prompt={prompt}
        index={index}
        answer={String(answers[transcriptKey(prompt.id)] ?? '')}
        allowOnlineRecognition={allowOnlineRecognition}
        onAnswer={value => onAnswer(transcriptKey(prompt.id), value)}
      />)}
    </div>
    <p className="speaking-hint">Speak in English. You can correct the transcript, replay your recording or record the answer again.</p>
  </>;
}

function SpeakingResponseCard({
  examId,
  prompt,
  index,
  answer,
  allowOnlineRecognition,
  onAnswer,
}: {
  examId: string;
  prompt: SpeakingPrompt;
  index: number;
  answer: string;
  allowOnlineRecognition: boolean;
  onAnswer: (value: string) => void;
}) {
  const capture = useSpeakingCapture({
    captureId: `${examId}:${prompt.id}`,
    allowOnlineRecognition,
    onTranscript: onAnswer,
  });
  return <article className="speaking-response-card">
    <div className="speaking-response-heading"><span className="speaking-number">{String(index + 1).padStart(2, '0')}</span><h3>{prompt.image?.title ?? prompt.prompt}</h3></div>
    {prompt.image && <SpeakingIllustration image={prompt.image} />}
    {prompt.image && <p className="illustration-caption">{prompt.image.photoUrl ? `Speaking photo · ${prompt.image.alt}` : `Original practice illustration · ${prompt.image.alt}`}</p>}
    {prompt.image?.photoSource && <a className="photo-credit" href={prompt.image.photoSource} target="_blank" rel="noreferrer">Photo by {prompt.image.photoCredit ?? 'the photographer'} · View source ↗</a>}
    {!prompt.image && <p className="speaking-question">{prompt.prompt}</p>}
    <div className="speaking-controls">
      {capture.status === 'recording'
        ? <button className="record-button recording" onClick={capture.stopRecording}><span className="record-dot" /> Stop recording</button>
        : <button className="record-button" disabled={capture.status === 'checking' || capture.status === 'saving'} onClick={capture.startRecording}><span className="record-dot" />{capture.status === 'checking' ? 'Preparing…' : capture.status === 'saving' ? 'Saving…' : capture.audioUrl ? 'Record again' : 'Start recording'}</button>}
      {capture.audioUrl && <audio className="speaking-audio" controls src={capture.audioUrl}>Your browser does not support audio playback.</audio>}
    </div>
    {capture.recognitionMessage && <p className="recognition-message" role="status">{capture.recognitionMessage}</p>}
    {capture.error && <p className="speaking-error" role="alert">{capture.error}</p>}
    <label className="transcript-label" htmlFor={`transcript-${prompt.id}`}>Live transcript <span>Editable</span></label>
    <textarea id={`transcript-${prompt.id}`} className="speaking-transcript" value={answer} onChange={event => onAnswer(event.target.value)} placeholder="Your recognised speech will appear here. You can also type your answer…" rows={3} />
    {capture.audioUrl && <button type="button" className="text-button delete-recording" onClick={capture.removeRecording}>Delete this recording</button>}
  </article>;
}

function getSpeakingPrompts(part: SpeakingPart): SpeakingPrompt[] {
  if (part.type === 'photo-description') {
    return (part.images ?? []).map(image => ({ id: image.id, image, prompt: part.prompt ?? image.alt }));
  }
  if (part.type === 'collaborative-task') {
    return (part.images ?? []).map(image => ({ id: image.id, image, prompt: `${part.prompt ?? 'Discuss this option.'} ${image.title}` }));
  }
  return (part.questions ?? []).map(question => ({ id: question.id, prompt: question.prompt }));
}

function transcriptKey(id: string) { return `speaking:${id}`; }

const SCENE_COLOURS: Record<SpeakingImagePrompt['scene'], { sky: string; ground: string; accent: string }> = {
  garden: { sky: '#e8f2ea', ground: '#acc89d', accent: '#6e9a70' },
  cooking: { sky: '#f4eadc', ground: '#d9c3a5', accent: '#dd9664' },
  cycling: { sky: '#e3eef4', ground: '#b6cfaa', accent: '#4c8291' },
  music: { sky: '#ede8f2', ground: '#c6b2cb', accent: '#846b9e' },
  classroom: { sky: '#e8eff4', ground: '#d0c6a9', accent: '#6687a6' },
  computer: { sky: '#e8edf2', ground: '#cbc7bd', accent: '#7186ad' },
  cafe: { sky: '#f2eadd', ground: '#d1bca2', accent: '#b87957' },
  train: { sky: '#e5eef3', ground: '#bfc9ca', accent: '#66889b' },
  beach: { sky: '#dceef3', ground: '#e9d7a8', accent: '#4d9ab0' },
  museum: { sky: '#eee9e1', ground: '#d2c5ae', accent: '#9c8264' },
  market: { sky: '#e8eee1', ground: '#c7c394', accent: '#809246' },
  park: { sky: '#e1eef0', ground: '#afc69e', accent: '#6d9673' },
};

function SpeakingIllustration({ image }: { image: SpeakingImagePrompt }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const colours = SCENE_COLOURS[image.scene];
  const sceneLabel = image.scene.replace('-', ' ');
  if (image.photoUrl && !photoFailed) return <div className="speaking-photo"><img src={image.photoUrl} alt={image.alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} /></div>;
  return <div className="speaking-illustration" role="img" aria-label={image.alt}>
    <svg viewBox="0 0 640 300" aria-hidden="true" focusable="false">
      <defs><linearGradient id={`sky-${image.id}`} x2="0" y2="1"><stop stopColor={colours.sky}/><stop offset="1" stopColor="#fff" stopOpacity=".28"/></linearGradient></defs>
      <rect width="640" height="300" fill={`url(#sky-${image.id})`} />
      <circle cx="535" cy="57" r="25" fill="#f6dca4" opacity=".9" />
      <path d="M0 197 Q160 153 315 192 T640 176 V300 H0Z" fill={colours.ground} />
      {image.scene === 'train' ? <TrainScene accent={colours.accent} /> : image.scene === 'beach' ? <BeachScene accent={colours.accent} /> : image.scene === 'classroom' || image.scene === 'computer' ? <LearningScene accent={colours.accent} /> : image.scene === 'cooking' || image.scene === 'cafe' || image.scene === 'market' ? <TableScene accent={colours.accent} scene={image.scene} /> : <OutdoorScene accent={colours.accent} scene={image.scene} />}
      <rect x="0" y="264" width="640" height="36" fill="#fff" opacity=".7" />
      <text x="24" y="288" fill="#526168" fontSize="13" fontFamily="sans-serif" letterSpacing="2">{sceneLabel.toUpperCase()} · SPEAKING PRACTICE</text>
    </svg>
  </div>;
}

function Person({ x, y, colour, scale = 1 }: { x: number; y: number; colour: string; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><circle cx="0" cy="0" r="12" fill="#d99b76"/><path d="M-16 16 Q0 6 16 16 L20 62 H-20Z" fill={colour}/><path d="M-12 62 L-17 93 M12 62 L18 93" stroke="#495e69" strokeWidth="8" strokeLinecap="round"/><path d="M-15 25 L-30 48 M15 25 L29 43" stroke="#d99b76" strokeWidth="7" strokeLinecap="round"/></g>;
}
function OutdoorScene({ accent, scene }: { accent: string; scene: SpeakingImagePrompt['scene'] }) {
  return <g>
    {scene === 'garden' || scene === 'park' ? <g fill={accent} opacity=".8"><circle cx="100" cy="108" r="46"/><circle cx="164" cy="122" r="35"/><circle cx="465" cy="117" r="52"/><path d="M130 135v75m336-66v65" stroke="#745e43" strokeWidth="12"/></g> : null}
    {scene === 'cycling' ? <g fill="none" stroke="#465d6a" strokeWidth="5"><circle cx="194" cy="210" r="35"/><circle cx="343" cy="210" r="35"/><path d="m194 210 42-64 39 64h-81l35-39h64l50 39m-68-92h28"/></g> : null}
    {scene === 'music' ? <g><rect x="428" y="135" width="120" height="74" rx="4" fill="#544d63"/><path d="M445 186h85M462 164v42M490 155v51M518 167v39" stroke="#dbb986" strokeWidth="5"/><circle cx="488" cy="98" r="17" fill="#d99b76"/></g> : null}
    <Person x={253} y={111} colour={accent} /><Person x={365} y={120} colour="#d88861" scale={.92}/>
    {scene === 'garden' ? <g stroke={accent} strokeWidth="4"><path d="M312 211v37m22-37v37m-42-25h64"/><circle cx="312" cy="206" r="5" fill="#e7b780"/><circle cx="334" cy="206" r="5" fill="#e7b780"/></g> : null}
  </g>;
}
function LearningScene({ accent }: { accent: string }) {
  return <g><rect x="85" y="64" width="140" height="94" rx="5" fill="#fff" stroke="#82949a" strokeWidth="3"/><path d="M103 89h105M103 109h72M103 129h87" stroke={accent} strokeWidth="5" strokeLinecap="round"/><rect x="199" y="190" width="260" height="11" rx="5" fill="#9b856a"/><Person x={278} y={112} colour={accent} scale={.85}/><Person x={380} y={105} colour="#d88861" scale={.88}/></g>;
}
function TableScene({ accent, scene }: { accent: string; scene: SpeakingImagePrompt['scene'] }) {
  return <g><rect x="130" y="173" width="385" height="16" rx="7" fill="#9b765a"/><path d="M173 188v65m300-65v65" stroke="#80664f" strokeWidth="9"/><Person x={220} y={87} colour={accent} scale={.8}/><Person x={423} y={91} colour="#738c78" scale={.8}/><ellipse cx="320" cy="164" rx="52" ry="14" fill="#f5f2e9" stroke="#948a75" strokeWidth="3"/>{scene === 'market' && <g fill={accent}><circle cx="301" cy="159" r="11"/><circle cx="320" cy="154" r="12"/><circle cx="340" cy="160" r="10"/></g>}</g>;
}
function TrainScene({ accent }: { accent: string }) {
  return <g><rect x="48" y="54" width="260" height="109" rx="5" fill="#f9fbfa" stroke="#82949a" strokeWidth="4"/><text x="74" y="91" fill={accent} fontSize="19" fontFamily="sans-serif">Next train · 10:24</text><path d="M72 111h180m-180 22h128" stroke="#b4c1c2" strokeWidth="6" strokeLinecap="round"/><path d="M0 236h640" stroke="#737b7d" strokeWidth="7"/><path d="M0 251h640" stroke="#d8d9d4" strokeWidth="4" strokeDasharray="18 13"/><Person x={363} y={104} colour={accent}/><Person x={454} y={124} colour="#d88861" scale={.84}/></g>;
}
function BeachScene({ accent }: { accent: string }) {
  return <g><path d="M0 189 Q180 170 340 195 T640 181 V225 H0Z" fill="#78b7c1"/><path d="M0 225 Q175 205 336 226 T640 217 V270 H0Z" fill="#f5e6be"/><path d="M0 247h640" stroke="#fff" strokeWidth="5" strokeDasharray="20 10" opacity=".8"/><Person x={252} y={120} colour={accent}/><Person x={358} y={128} colour="#d88861" scale={.86}/></g>;
}
