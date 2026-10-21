import type { ChoiceQuestion, ReadingPart } from '../types/exam';
import type { Answers } from '../types/session';

export function SectionHeading({ part, skill }: { part: number; skill: string }) { return <div className="section-heading-paper"><div className="part-kicker">{skill} · PART {part}</div></div>; }

function Passage({ text, part, answers, onAnswer }: { text: string; part: ReadingPart; answers: Answers; onAnswer: (id: string, value: string | number) => void }) {
  if (part.type !== 'gapped-text' && part.type !== 'open-cloze') return <div className="passage">{text.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>;
  const tokens = text.split(/(\[\d+\])/g);
  return <div className="passage cloze-passage">{tokens.map((token, i) => {
    const match = token.match(/^\[(\d+)\]$/);
    if (!match) return <span key={i}>{token}</span>;
    const gap = part.gaps?.[Number(match[1]) - 1];
    if (!gap) return token;
    return part.type === 'gapped-text' ? <select aria-label={`Gap ${match[1]}`} key={i} value={String(answers[gap.id] ?? '')} onChange={e => onAnswer(gap.id, e.target.value)}><option value="">{match[1]}</option>{part.sentences?.map((sentence, index) => <option key={index} value={String.fromCharCode(65 + index)}>{String.fromCharCode(65 + index)} · {sentence}</option>)}</select> : <input key={i} aria-label={`Gap ${match[1]}`} className="inline-gap" value={String(answers[gap.id] ?? '')} onChange={e => onAnswer(gap.id, e.target.value)} />;
  })}</div>;
}

export function ReadingPanel({ part, answers, onAnswer }: { part: ReadingPart; answers: Answers; onAnswer: (id: string, value: string | number) => void }) {
  return <><SectionHeading part={part.part} skill="READING"/><h2>{part.title}</h2><p className="instructions">{part.instructions}</p>
    {part.type === 'notices' && <div className="notice-grid">{(part.passage as string[]).map((notice, i) => <article className="notice" key={i}><span className="notice-number">0{i + 1}</span><p>{notice}</p><Question question={part.questions![i]} answers={answers} onAnswer={onAnswer} compact /></article>)}</div>}
    {part.type === 'matching' && <><div className="matching-texts">{part.texts?.map(item => <article key={item.id}><b>{item.id} · {item.title}</b><p>{item.text}</p></article>)}</div><div className="matching-questions">{part.questions?.map(q => <Question key={q.id} question={q} answers={answers} onAnswer={onAnswer}/>)}</div></>}
    {part.type === 'multiple-choice' && <><Passage text={part.passage as string} part={part} answers={answers} onAnswer={onAnswer}/><div className="question-list">{part.questions?.map(q => <Question key={q.id} question={q} answers={answers} onAnswer={onAnswer}/>)}</div></>}
    {part.type === 'gapped-text' && <><Passage text={String(part.passage ?? '')} part={part} answers={answers} onAnswer={onAnswer}/><div className="sentence-bank"><b>Sentences</b><div>{part.sentences?.map((sentence,i)=><p key={i}><strong>{String.fromCharCode(65+i)}</strong>{sentence}</p>)}</div></div></>}
    {part.type === 'multiple-choice-cloze' && <><Passage text={String(part.passage ?? '')} part={part} answers={answers} onAnswer={onAnswer}/><div className="question-list cloze-questions">{part.questions?.map(q => <Question key={q.id} question={q} answers={answers} onAnswer={onAnswer}/>)}</div></>}
    {part.type === 'open-cloze' && <Passage text={String(part.passage ?? '')} part={part} answers={answers} onAnswer={onAnswer}/>}
  </>;
}

export function Question({ question, answers, onAnswer, compact = false }: { question: ChoiceQuestion; answers: Answers; onAnswer: (id: string, value: number) => void; compact?: boolean }) {
  const letterOptions = question.options.every(option => /^[A-H]$/.test(option.trim()));
  return <fieldset className={`question ${compact ? 'compact' : ''}`}><legend><span className="question-number">{question.id.split('-').at(-1)}</span>{question.prompt}</legend><div className={`options ${letterOptions ? 'letter-options' : ''}`}>{question.options.map((option,i)=><label key={i} className={`option ${Number(answers[question.id])===i?'chosen':''}`}><input type="radio" name={question.id} checked={Number(answers[question.id])===i} onChange={()=>onAnswer(question.id,i)}/>{!letterOptions && <span>{String.fromCharCode(65+i)}.</span>}{option}</label>)}</div></fieldset>;
}

export function AnswerReview({ questions, gaps, answers }: { questions: ChoiceQuestion[]; gaps: { id: string; answer: string; accepted?: string[] }[]; answers: Answers }) {
  const wrongQuestions = questions.filter(q => Number(answers[q.id]) !== q.answer);
  const wrongGaps = gaps.filter(g => String(answers[g.id] ?? '').trim().toLowerCase() !== g.answer.toLowerCase() && !(g.accepted ?? []).some(a => String(answers[g.id] ?? '').trim().toLowerCase() === a.toLowerCase()));
  if (!wrongQuestions.length && !wrongGaps.length) return null;
  return <ul className="review-list">{wrongQuestions.map(q=><li key={q.id}><b>{q.prompt}</b> Correct answer: {formatChoice(q, q.answer)}</li>)}{wrongGaps.map(g=><li key={g.id}>Gap {g.id.split('-').at(-1)}: expected <b>{g.answer}</b></li>)}</ul>;
}

function formatChoice(question: ChoiceQuestion, index: number) {
  const option = question.options[index];
  return /^[A-H]$/.test(option.trim()) ? option : `${String.fromCharCode(65 + index)}. ${option}`;
}
