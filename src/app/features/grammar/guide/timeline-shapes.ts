import type { TimelineShape } from '../../../models/grammar';

/** Width of the drawing in SVG units. The past is left of `NOW_X`, the future right of it. */
export const TIMELINE_WIDTH = 300;
export const NOW_X = 150;

/**
 * `dot` an action, `ref` the time the sentence talks about, `bar` an action in progress, `arrow`
 * a link to a later time, `dots` a repeated action, `stop` the end of a past habit.
 */
export type TimelineMark =
  | { kind: 'dot' | 'ref' | 'stop'; x: number }
  | { kind: 'bar' | 'arrow' | 'dots'; from: number; to: number };

const MARKS: Record<TimelineShape, TimelineMark[]> = {
  habit: [{ kind: 'dots', from: 20, to: 280 }],
  'now-progress': [{ kind: 'bar', from: 110, to: 190 }],
  'past-point': [{ kind: 'dot', x: 80 }],
  'past-progress': [
    { kind: 'bar', from: 45, to: 115 },
    { kind: 'ref', x: 80 },
  ],
  'past-to-now': [
    { kind: 'arrow', from: 60, to: NOW_X },
    { kind: 'dot', x: 60 },
  ],
  'past-to-now-progress': [{ kind: 'bar', from: 60, to: NOW_X }],
  'before-past': [
    { kind: 'arrow', from: 45, to: 92 },
    { kind: 'dot', x: 45 },
    { kind: 'ref', x: 100 },
  ],
  'past-habit': [
    { kind: 'dots', from: 20, to: 105 },
    { kind: 'stop', x: 125 },
  ],
  'future-point': [{ kind: 'dot', x: 230 }],
  'now-to-future': [
    { kind: 'arrow', from: NOW_X, to: 222 },
    { kind: 'ref', x: NOW_X },
    { kind: 'dot', x: 230 },
  ],
  'future-progress': [
    { kind: 'bar', from: 195, to: 265 },
    { kind: 'ref', x: 230 },
  ],
  'before-future': [
    { kind: 'arrow', from: 190, to: 242 },
    { kind: 'dot', x: 190 },
    { kind: 'ref', x: 250 },
  ],
};

/** The marks of one shape, in drawing order (later marks sit on top). */
export function timelineMarks(shape: TimelineShape): TimelineMark[] {
  return MARKS[shape];
}

/** Centres of the small dots of a `dots` mark, one every `step` units. */
export function dotPositions(from: number, to: number, step = 20): number[] {
  const xs: number[] = [];
  for (let x = from; x <= to; x += step) xs.push(x);
  return xs;
}
