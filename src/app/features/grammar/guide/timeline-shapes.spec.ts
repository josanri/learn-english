import type { TimelineShape } from '../../../models/grammar';
import { NOW_X, TIMELINE_WIDTH, timelineMarks, type TimelineMark } from './timeline-shapes';

const ALL: TimelineShape[] = [
  'habit',
  'now-progress',
  'past-point',
  'past-progress',
  'past-to-now',
  'past-to-now-progress',
  'before-past',
  'past-habit',
  'future-point',
  'now-to-future',
  'future-progress',
  'before-future',
];

/** Smallest and largest x that a mark covers. */
function extent(marks: TimelineMark[]): [number, number] {
  const xs = marks.flatMap((m) => ('x' in m ? [m.x] : [m.from, m.to]));
  return [Math.min(...xs), Math.max(...xs)];
}

describe('timelineMarks', () => {
  it('draws every shape inside the drawing', () => {
    for (const shape of ALL) {
      const marks = timelineMarks(shape);
      expect(marks.length, shape).toBeGreaterThan(0);
      const [min, max] = extent(marks);
      expect(min, shape).toBeGreaterThanOrEqual(0);
      expect(max, shape).toBeLessThanOrEqual(TIMELINE_WIDTH);
    }
  });

  it('keeps past shapes before now and future shapes after now', () => {
    for (const shape of ['past-point', 'past-progress', 'before-past', 'past-habit'] as const) {
      expect(extent(timelineMarks(shape))[1], shape).toBeLessThan(NOW_X);
    }
    for (const shape of ['future-point', 'future-progress', 'before-future'] as const) {
      expect(extent(timelineMarks(shape))[0], shape).toBeGreaterThan(NOW_X);
    }
  });

  it('crosses now for habits and actions in progress now', () => {
    for (const shape of ['habit', 'now-progress'] as const) {
      const [min, max] = extent(timelineMarks(shape));
      expect(min, shape).toBeLessThan(NOW_X);
      expect(max, shape).toBeGreaterThan(NOW_X);
    }
  });

  it('links the past to now for the present perfect', () => {
    for (const shape of ['past-to-now', 'past-to-now-progress'] as const) {
      const [min, max] = extent(timelineMarks(shape));
      expect(min, shape).toBeLessThan(NOW_X);
      expect(max, shape).toBe(NOW_X);
    }
  });

  it('puts the perfect action before its reference time', () => {
    for (const shape of ['before-past', 'before-future'] as const) {
      const marks = timelineMarks(shape);
      const dot = marks.find((m) => m.kind === 'dot');
      const ref = marks.find((m) => m.kind === 'ref');
      expect(dot && ref && 'x' in dot && 'x' in ref && dot.x < ref.x, shape).toBe(true);
    }
  });
});
