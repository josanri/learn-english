import { exams } from '../data';
import { PAPER_SECTIONS } from '../constants/app';
import type { PracticeExam } from '../types/exam';
import type { Result } from '../types/session';

export function Dashboard({ onStart, results }: { onStart: (exam: PracticeExam) => void; results: Record<string, Result> }) {
  const completed = Object.keys(results).length;
  const totalCorrect = Object.values(results).reduce((n, r) => n + r.correct, 0);
  return <div className="page dashboard"><div className="eyebrow">YOUR PREPARATION · CAMBRIDGE B1 PRELIMINARY</div><section className="hero"><div className="hero-copy"><div className="eyebrow">WELCOME BACK</div><h1>Build your English,<br />one <em>paper</em> at a time.</h1><p>Practise with original B1-level materials designed around the real exam format. Read, write, listen and speak at your own pace.</p><div className="hero-stats"><div><b>{String(exams.length).padStart(2, '0')}</b><span>practice papers</span></div><div><b>{Object.keys(PAPER_SECTIONS).length.toString().padStart(2, '0')}</b><span>skills to practise</span></div><div><b>{completed}</b><span>papers completed</span></div></div></div><div className="journey-card"><div className="journey-top"><span>Your progress</span><b>{completed} / {exams.length}</b></div><h2>{completed ? 'You are making progress.' : 'Your first step starts here.'}</h2><p>{totalCorrect ? `${totalCorrect} correct answers across your completed papers` : 'Complete a practice paper to see your results.'}</p><div className="progress-track"><i style={{ width: `${completed / exams.length * 100}%` }} /></div></div></section>
    <div className="section-heading" id="practice-library"><div><div className="eyebrow">PRACTICE LIBRARY</div><h2>Choose a practice paper</h2></div><span className="library-count">{String(exams.length).padStart(2, '0')} PAPERS</span></div>
    <div className="exam-grid">{exams.map((exam, i) => { const result = results[exam.id]; return <article className="exam-card" key={exam.id}><div className="card-top"><span className="exam-index">PAPER 0{i + 1} · B1</span><span className={`status-pill ${result ? 'done' : ''}`}>{result ? 'COMPLETED' : 'READY'}</span></div><h3>{exam.title}</h3><p>{exam.subtitle}</p><div className="theme-label">{exam.theme}</div><div className="skill-tags"><span><i className="dot blue" />Reading</span><span><i className="dot orange" />Writing</span><span><i className="dot green" />Listening</span><span><i className="dot purple" />Speaking</span></div><div className="card-footer"><span>57 objective questions · 4 skills</span><button className="primary-button" onClick={() => onStart(exam)}>{result ? 'Try again' : 'Start paper'} →</button></div></article>; })}</div>
    <div className="tip"><span>✳</span><p><b>Exam tip</b> The real listening recordings are played twice. In this practice, you can replay each part up to two times.</p></div>
    <p className="provenance">Original practice materials · Not an official Cambridge English paper</p>
  </div>;
}
