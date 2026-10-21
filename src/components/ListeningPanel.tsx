import type { ListeningPart } from '../types/exam';
import type { Answers } from '../types/session';
import { Question, SectionHeading } from './ReadingPanel';

export function ListeningPanel({ part, answers, onAnswer, onPlay, plays, showTranscript, onTranscript }: { part: ListeningPart; answers: Answers; onAnswer: (id: string, value: string | number) => void; onPlay: () => void; plays: number; showTranscript: boolean; onTranscript: () => void }) {
  const script = part.clips?.map(c => `${c.speaker}: ${c.script}`).join('\n\n') ?? part.script ?? '';
  return <><SectionHeading part={part.part} skill="LISTENING"/><h2>{part.title}</h2><p className="instructions">{part.instructions}</p>
    <div className="audio-panel"><button className="play-button" onClick={onPlay} aria-label="Play listening audio">▶</button><div className="audio-copy"><b>English audio</b><span>Browser-generated voice · {plays} / 2 plays</span></div><button className="outline-button" onClick={onTranscript}>{showTranscript ? 'Hide transcript' : 'Show transcript'}</button></div>
    <p className="audio-note">Listen to the audio twice before checking your answers. Voice availability depends on your browser and device.</p>
    {showTranscript && <div className="transcript">{script.split('\n').map((line,i)=><p key={i}>{line}</p>)}</div>}
    {part.clips && <div className="listening-clips">{part.clips.map((clip,i)=><article className="clip-question" key={clip.id}><div className="clip-title"><span>0{i+1}</span>{clip.speaker}</div><Question question={clip.question} answers={answers} onAnswer={onAnswer}/></article>)}</div>}
    {part.type === 'note-completion' && <><div className="listening-notes">{part.gaps?.map((gap,i)=><label key={gap.id}><span>{i+1}</span><b>{gap.prompt}</b><input value={String(answers[gap.id] ?? '')} onChange={e=>onAnswer(gap.id,e.target.value)} aria-label={gap.prompt}/></label>)}</div></>}
    {part.type === 'interview' && <div className="question-list">{part.questions?.map(q=><Question key={q.id} question={q} answers={answers} onAnswer={onAnswer}/>)}</div>}
  </>;
}
