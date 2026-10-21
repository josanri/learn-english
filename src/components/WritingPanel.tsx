import type { WritingTask } from '../types/exam';
import { countWords } from '../lib/text';
import { SectionHeading } from './ReadingPanel';

export function WritingPanel({ task, answer, selected, onSelect, onAnswer }: { task: WritingTask; answer: string; selected: 'article' | 'story'; onSelect: (v: 'article'|'story')=>void; onAnswer: (v: string)=>void }) {
  const words = countWords(answer);
  return <><SectionHeading part={task.type === 'email' ? 1 : 2} skill="WRITING"/><h2>{task.title}</h2><p className="instructions">Write {task.wordCount}. Plan your ideas, then check your answer.</p>
    {task.type !== 'email' && <div className="writing-choice"><span>Choose one task</span><label><input type="radio" name="writing-choice" checked={selected==='article'} onChange={()=>onSelect('article')}/> Article</label><label><input type="radio" name="writing-choice" checked={selected==='story'} onChange={()=>onSelect('story')}/> Story</label></div>}
    <div className="writing-prompt"><b>{task.type === 'email' ? 'YOUR TASK' : task.type.toUpperCase()}</b><p>{task.prompt}</p>{task.sourceEmail && <div className="source-email"><div><span>FROM</span><b>{task.sourceEmail.from}</b><span>SUBJECT</span><b>{task.sourceEmail.subject}</b></div><p>{task.sourceEmail.body}</p></div>}{task.openingSentence && <blockquote>{task.openingSentence}</blockquote>}{task.notes && <ul>{task.notes.map(note=><li key={note}>{note}</li>)}</ul>}</div>
    <div className="writing-toolbar"><span>Your answer</span><b>{words} words <i>·</i> about 100</b></div><textarea className="writing-input" value={answer} onChange={e=>onAnswer(e.target.value)} placeholder="Write your answer in English…" aria-label="Your writing answer" />
    <div className="writing-checklist"><b>Quick self-check</b><span>☐ I covered every point in the task.</span><span>☐ My ideas are clear and in a logical order.</span><span>☐ I checked my grammar, vocabulary and spelling.</span></div><p className="honesty-note">This practice tool counts words and saves your draft. Writing quality needs human feedback; this is not an official Cambridge score.</p>
  </>;
}
