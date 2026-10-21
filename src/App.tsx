import { useEffect, useMemo, useState } from 'react';
import { SpeakingPanel } from './components/SpeakingPanel';
import { Sidebar, Topbar } from './components/AppChrome';
import { Dashboard } from './components/Dashboard';
import { ListeningPanel } from './components/ListeningPanel';
import { ReadingPanel } from './components/ReadingPanel';
import { AnswerReview } from './components/ReadingPanel';
import { Results } from './components/Results';
import { WritingPanel } from './components/WritingPanel';
import { readSavedData, writeSavedData, type SavedExamData } from './lib/persistence';
import type { ChoiceQuestion, ListeningPart, PracticeExam } from './types/exam';
import type { Answers } from './types/session';

type Persisted = SavedExamData;
function partKey(skill: string, part: number) { return `${skill}-${part}`; }

export default function App() {
  const [persisted, setPersisted] = useState<Persisted>(readSavedData);
  const [exam, setExam] = useState<PracticeExam | null>(null);
  const [active, setActive] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [feedback, setFeedback] = useState<{ title: string; message: string; correct?: boolean } | null>(null);
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedWriting, setSelectedWriting] = useState<'article' | 'story'>('article');
  const [finished, setFinished] = useState(false);
  const [allowOnlineRecognition, setAllowOnlineRecognition] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'Home' | 'Practice papers'>('Home');

  useEffect(() => { writeSavedData(persisted); }, [persisted]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const currentSkill = active.split('-')[0];
  const currentNumber = Number(active.split('-')[1]);
  const currentReading = currentSkill === 'reading' ? exam?.reading.find(p => p.part === currentNumber) : undefined;
  const currentListening = currentSkill === 'listening' ? exam?.listening.find(p => p.part === currentNumber) : undefined;
  const currentWriting = currentSkill === 'writing' && exam ? (currentNumber === 1 ? exam.writing.part1 : exam.writing.part2.find(t => t.type === selectedWriting)) : undefined;
  const currentSpeaking = currentSkill === 'speaking' ? exam?.speaking.find(p => p.part === currentNumber) : undefined;
  const allQuestionIds = useMemo(() => exam ? [
    ...exam.reading.flatMap(p => p.questions?.map(q => q.id) ?? p.gaps?.map(g => g.id) ?? []),
    ...exam.listening.flatMap(p => p.clips?.map(c => c.question.id) ?? p.questions?.map(q => q.id) ?? p.gaps?.map(g => g.id) ?? []),
  ] : [], [exam]);

  function startExam(item: PracticeExam) {
    setExam(item);
    const savedAnswers = persisted.answers[item.id] ?? {};
    setAnswers(savedAnswers);
    setActive('reading-1');
    setFeedback(null); setFinished(false); setPlays({}); setShowTranscript(false); setSelectedWriting(savedAnswers['writing-2-type'] === 'story' ? 'story' : 'article'); setActiveMenu('Practice papers');
  }
  function goHome() { setExam(null); setFinished(false); setActiveMenu('Home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function goToPracticePapers() {
    setExam(null); setFinished(false); setActiveMenu('Practice papers');
    window.setTimeout(() => document.getElementById('practice-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
  function goTo(next: string) { setActive(next); setFeedback(null); setShowTranscript(false); window.speechSynthesis?.cancel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function updateAnswer(id: string, value: string | number) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    if (exam) setPersisted(p => ({ ...p, answers: { ...p.answers, [exam.id]: next } }));
    setFeedback(null);
  }

  function playListening(part: ListeningPart) {
    if (!('speechSynthesis' in window)) { setFeedback({ title: 'Audio is not available', message: 'This browser does not support speech playback. You can still read the script after opening the transcript.' }); return; }
    const key = partKey('listening', part.part);
    const used = plays[key] ?? 0;
    if (used >= 2) { setFeedback({ title: 'Two plays used', message: 'You have used both plays for this listening part. Open the transcript to review it.' }); return; }
    const script = part.clips?.map(clip => `${clip.speaker}. ${clip.script}`).join(' ... ') ?? part.script ?? '';
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'en-GB'; utterance.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase() === 'en-gb') ?? window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('en'));
    if (voice) utterance.voice = voice;
    setPlays(p => ({ ...p, [key]: used + 1 })); setFeedback(null);
    window.speechSynthesis.speak(utterance);
  }

  function checkCurrent() {
    if (!exam) return;
    const mc = currentReading?.questions ?? currentListening?.clips?.map(c => c.question) ?? currentListening?.questions ?? [];
    const gaps = currentReading?.gaps ?? currentListening?.gaps ?? [];
    const ids = [...mc.map(q => q.id), ...gaps.map(g => g.id)];
    const missing = ids.filter(id => answers[id] === undefined || answers[id] === '');
    if (missing.length) { setFeedback({ title: 'A few answers are missing', message: `You still have ${missing.length} unanswered question${missing.length === 1 ? '' : 's'}. You can check this part now or come back later.` }); return; }
    const correct = mc.reduce((n, q) => n + (Number(answers[q.id]) === q.answer ? 1 : 0), 0)
      + gaps.reduce((n, gap) => n + (String(answers[gap.id] ?? '').trim().toLowerCase() === gap.answer.toLowerCase() || (gap.accepted ?? []).some(a => String(answers[gap.id] ?? '').trim().toLowerCase() === a.toLowerCase()) ? 1 : 0), 0);
    setFeedback({ title: `${correct} / ${ids.length} correct`, message: ids.length === correct ? 'Excellent work. Every answer in this part is correct.' : 'Review the answer notes below and have another go when you are ready.', correct: correct === ids.length });
  }

  function finishExam() {
    if (!exam) return;
    const questionList: ChoiceQuestion[] = [
      ...exam.reading.flatMap(p => p.questions ?? []),
      ...exam.listening.flatMap(p => p.clips?.map(c => c.question) ?? p.questions ?? []),
    ];
    const gaps = [...exam.reading.flatMap(p => p.gaps ?? []), ...exam.listening.flatMap(p => p.gaps ?? [])];
    const correct = questionList.reduce((n, q) => n + (Number(answers[q.id]) === q.answer ? 1 : 0), 0)
      + gaps.reduce((n, gap) => n + (String(answers[gap.id] ?? '').trim().toLowerCase() === gap.answer.toLowerCase() || (gap.accepted ?? []).some(a => String(answers[gap.id] ?? '').trim().toLowerCase() === a.toLowerCase()) ? 1 : 0), 0);
    const result = { correct, total: questionList.length + gaps.length, completedAt: new Date().toISOString() };
    setPersisted(p => ({ ...p, results: { ...p.results, [exam.id]: result } })); setFinished(true); setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!exam || finished) return <>
    <div className="app-shell"><Sidebar onHome={goHome} onPracticePapers={goToPracticePapers} active={finished ? 'Results' : activeMenu} />
      <main className="main"><Topbar />{finished && exam ? <Results exam={exam} answers={answers} result={persisted.results[exam.id]} onHome={goHome} /> : <Dashboard onStart={startExam} results={persisted.results} />}</main>
    </div>
  </>;

  const progress = allQuestionIds.filter(id => answers[id] !== undefined && answers[id] !== '').length;
  const items = [
    ...exam.reading.map(p => ({ key: partKey('reading', p.part), label: `Reading · Part ${p.part}`, type: 'reading' })),
    { key: 'writing-1', label: 'Writing · Part 1', type: 'writing' }, { key: 'writing-2', label: 'Writing · Part 2', type: 'writing' },
    ...exam.listening.map(p => ({ key: partKey('listening', p.part), label: `Listening · Part ${p.part}`, type: 'listening' })),
    ...exam.speaking.map(p => ({ key: partKey('speaking', p.part), label: `Speaking · Part ${p.part}`, type: 'speaking' })),
  ];

  return <div className="app-shell"><Sidebar onHome={goHome} onPracticePapers={goToPracticePapers} active="Practice" />
    <main className="main"><Topbar />
      <div className="page exam-page">
        <div className="exam-heading"><div><div className="eyebrow">B1 PRELIMINARY · PRACTICE PAPER</div><h1>{exam.title}</h1><p>{exam.subtitle}</p></div><button className="outline-button" onClick={() => { setExam(null); setFinished(false); }}>← Exam library</button></div>
        <div className="exam-layout">
          <aside className="exam-rail"><div className="rail-label">PAPER CONTENTS</div><div className="rail-group-label">READING</div>{exam.reading.map(p => <button key={p.part} className={`rail-link ${active === partKey('reading', p.part) ? 'selected' : ''}`} onClick={() => goTo(partKey('reading', p.part))}><span>0{p.part}</span>{p.title}</button>)}
            <div className="rail-group-label">WRITING</div>{[1,2].map(n => <button key={n} className={`rail-link ${active === `writing-${n}` ? 'selected' : ''}`} onClick={() => goTo(`writing-${n}`)}><span>0{n}</span>Part {n}</button>)}
            <div className="rail-group-label">LISTENING</div>{exam.listening.map(p => <button key={p.part} className={`rail-link ${active === partKey('listening', p.part) ? 'selected' : ''}`} onClick={() => goTo(partKey('listening', p.part))}><span>0{p.part}</span>{p.title}</button>)}
            <div className="rail-group-label">SPEAKING</div>{exam.speaking.map(p => <button key={p.part} className={`rail-link ${active === partKey('speaking', p.part) ? 'selected' : ''}`} onClick={() => goTo(partKey('speaking', p.part))}><span>0{p.part}</span>{p.title}</button>)}
            <div className="rail-progress"><div className="progress-label"><span>Questions answered</span><b>{progress} / {allQuestionIds.length}</b></div><div className="progress-track"><i style={{ width: `${allQuestionIds.length ? progress / allQuestionIds.length * 100 : 0}%` }} /></div></div>
          </aside>
          <section className="paper-card">
            {currentReading && <ReadingPanel part={currentReading} answers={answers} onAnswer={updateAnswer} />}
            {currentListening && <ListeningPanel part={currentListening} answers={answers} onAnswer={updateAnswer} onPlay={() => playListening(currentListening)} plays={plays[active] ?? 0} showTranscript={showTranscript} onTranscript={() => setShowTranscript(v => !v)} />}
            {currentWriting && <WritingPanel task={currentWriting} answer={String(answers[`writing-${currentNumber}`] ?? '')} selected={selectedWriting} onSelect={value => { setSelectedWriting(value); updateAnswer('writing-2-type', value); }} onAnswer={value => updateAnswer(`writing-${currentNumber}`, value)} />}
            {currentSpeaking && <SpeakingPanel examId={exam.id} part={currentSpeaking} answers={answers} onAnswer={updateAnswer} allowOnlineRecognition={allowOnlineRecognition} onOnlineRecognitionChange={setAllowOnlineRecognition} />}
            {feedback && <div className={`feedback ${feedback.correct ? 'success' : ''}`} role="status"><strong>{feedback.title}</strong><p>{feedback.message}</p>{currentReading && <AnswerReview questions={currentReading.questions ?? []} gaps={currentReading.gaps ?? []} answers={answers} />}{currentListening && <AnswerReview questions={currentListening.clips?.map(c => c.question) ?? currentListening.questions ?? []} gaps={currentListening.gaps ?? []} answers={answers} />}</div>}
            <div className="paper-actions">{(currentReading || currentListening) && <button className="outline-button" onClick={checkCurrent}>Check answers</button>}{currentWriting && <span className="writing-coach-note">Writing is saved as a draft. Use the checklist to review your response.</span>}{currentSpeaking && <span className="writing-coach-note">Speaking answers and recordings are saved in this browser.</span>}<div className="spacer" />
              <button className="outline-button" disabled={items.findIndex(i => i.key === active) === 0} onClick={() => goTo(items[items.findIndex(i => i.key === active) - 1].key)}>← Previous</button>
              {items.findIndex(i => i.key === active) < items.length - 1 ? <button className="primary-button" onClick={() => goTo(items[items.findIndex(i => i.key === active) + 1].key)}>Next part →</button> : <button className="primary-button" onClick={finishExam}>Finish paper</button>}
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>;
}
