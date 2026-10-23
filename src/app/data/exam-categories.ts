import type { ExamCategory } from '../models/exam';
import type { IconName } from '../shared/ui';

export interface ExamCategoryInfo {
  name: string;
  icon: IconName;
}

/** Name and icon of each exam topic group. Every `ExamCategory` needs a row here. */
export const EXAM_CATEGORIES: Record<ExamCategory, ExamCategoryInfo> = {
  animals: { name: 'Animals & wildlife', icon: 'bird' },
  nature: { name: 'Nature, weather & countryside', icon: 'mountains' },
  environment: { name: 'Environment & energy', icon: 'leaf' },
  travel: { name: 'Travel & holidays', icon: 'palm' },
  transport: { name: 'Transport', icon: 'plane' },
  sport: { name: 'Sport & outdoor activity', icon: 'trophy' },
  health: { name: 'Health & safety', icon: 'heartbeat' },
  food: { name: 'Food & drink', icon: 'chefhat' },
  home: { name: 'Home & daily life', icon: 'house' },
  people: { name: 'People & celebrations', icon: 'people' },
  study: { name: 'Study & work', icon: 'gradcap' },
  arts: { name: 'Arts & creativity', icon: 'palette' },
  entertainment: { name: 'Entertainment & media', icon: 'clapper' },
  science: { name: 'Science & technology', icon: 'robot' },
  games: { name: 'Games, hobbies & toys', icon: 'gamepad' },
  shopping: { name: 'Shopping & fashion', icon: 'bag' },
  history: { name: 'History & heritage', icon: 'columns' },
  misc: { name: 'Miscellaneous', icon: 'shapes' },
};
