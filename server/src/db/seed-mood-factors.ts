import { v4 as uuidv4 } from 'uuid';

export interface MoodFactor {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export const moodFactors: MoodFactor[] = [
  // Sleep & Rest
  { id: uuidv4(), name: 'Good sleep', category: 'sleep', icon: 'moon' },
  { id: uuidv4(), name: 'Poor sleep', category: 'sleep', icon: 'moon-off' },
  { id: uuidv4(), name: 'Well rested', category: 'sleep', icon: 'battery-full' },
  { id: uuidv4(), name: 'Tired', category: 'sleep', icon: 'battery-low' },
  { id: uuidv4(), name: 'Nap', category: 'sleep', icon: 'bed' },
  { id: uuidv4(), name: 'Insomnia', category: 'sleep', icon: 'alert-circle' },

  // Exercise & Physical
  { id: uuidv4(), name: 'Exercise', category: 'physical', icon: 'dumbbell' },
  { id: uuidv4(), name: 'Walking', category: 'physical', icon: 'footprints' },
  { id: uuidv4(), name: 'Running', category: 'physical', icon: 'run' },
  { id: uuidv4(), name: 'Yoga', category: 'physical', icon: 'flower' },
  { id: uuidv4(), name: 'Stretching', category: 'physical', icon: 'move' },
  { id: uuidv4(), name: 'Sports', category: 'physical', icon: 'trophy' },
  { id: uuidv4(), name: 'Swimming', category: 'physical', icon: 'waves' },
  { id: uuidv4(), name: 'Sedentary day', category: 'physical', icon: 'armchair' },

  // Nutrition
  { id: uuidv4(), name: 'Healthy eating', category: 'nutrition', icon: 'apple' },
  { id: uuidv4(), name: 'Junk food', category: 'nutrition', icon: 'pizza' },
  { id: uuidv4(), name: 'Skipped meals', category: 'nutrition', icon: 'utensils-crossed' },
  { id: uuidv4(), name: 'Hydrated', category: 'nutrition', icon: 'droplet' },
  { id: uuidv4(), name: 'Caffeine', category: 'nutrition', icon: 'coffee' },
  { id: uuidv4(), name: 'Alcohol', category: 'nutrition', icon: 'wine' },
  { id: uuidv4(), name: 'Fasting', category: 'nutrition', icon: 'clock' },

  // Social
  { id: uuidv4(), name: 'Quality time with family', category: 'social', icon: 'home' },
  { id: uuidv4(), name: 'Time with friends', category: 'social', icon: 'users' },
  { id: uuidv4(), name: 'Date night', category: 'social', icon: 'heart' },
  { id: uuidv4(), name: 'Social event', category: 'social', icon: 'party-popper' },
  { id: uuidv4(), name: 'Helped someone', category: 'social', icon: 'hand-helping' },
  { id: uuidv4(), name: 'Conflict', category: 'social', icon: 'swords' },
  { id: uuidv4(), name: 'Loneliness', category: 'social', icon: 'user-x' },
  { id: uuidv4(), name: 'Good conversation', category: 'social', icon: 'message-circle' },
  { id: uuidv4(), name: 'Social media', category: 'social', icon: 'smartphone' },

  // Work & Productivity
  { id: uuidv4(), name: 'Productive day', category: 'work', icon: 'check-circle' },
  { id: uuidv4(), name: 'Work stress', category: 'work', icon: 'briefcase' },
  { id: uuidv4(), name: 'Meeting heavy', category: 'work', icon: 'calendar' },
  { id: uuidv4(), name: 'Creative work', category: 'work', icon: 'lightbulb' },
  { id: uuidv4(), name: 'Deep focus', category: 'work', icon: 'target' },
  { id: uuidv4(), name: 'Procrastination', category: 'work', icon: 'clock' },
  { id: uuidv4(), name: 'Achievement', category: 'work', icon: 'award' },
  { id: uuidv4(), name: 'Deadline pressure', category: 'work', icon: 'alarm-clock' },
  { id: uuidv4(), name: 'Day off', category: 'work', icon: 'palm-tree' },

  // Mental & Mindfulness
  { id: uuidv4(), name: 'Meditation', category: 'mental', icon: 'brain' },
  { id: uuidv4(), name: 'Journaling', category: 'mental', icon: 'book-open' },
  { id: uuidv4(), name: 'Reading', category: 'mental', icon: 'book' },
  { id: uuidv4(), name: 'Learning', category: 'mental', icon: 'graduation-cap' },
  { id: uuidv4(), name: 'Therapy', category: 'mental', icon: 'message-square' },
  { id: uuidv4(), name: 'Anxiety', category: 'mental', icon: 'alert-triangle' },
  { id: uuidv4(), name: 'Overthinking', category: 'mental', icon: 'cloud' },
  { id: uuidv4(), name: 'Clear mind', category: 'mental', icon: 'sun' },
  { id: uuidv4(), name: 'Gratitude practice', category: 'mental', icon: 'sparkles' },

  // Environment
  { id: uuidv4(), name: 'Nature time', category: 'environment', icon: 'tree' },
  { id: uuidv4(), name: 'Sunshine', category: 'environment', icon: 'sun' },
  { id: uuidv4(), name: 'Rainy day', category: 'environment', icon: 'cloud-rain' },
  { id: uuidv4(), name: 'Cold weather', category: 'environment', icon: 'snowflake' },
  { id: uuidv4(), name: 'Hot weather', category: 'environment', icon: 'thermometer' },
  { id: uuidv4(), name: 'Fresh air', category: 'environment', icon: 'wind' },
  { id: uuidv4(), name: 'Stayed indoors', category: 'environment', icon: 'home' },
  { id: uuidv4(), name: 'Travel', category: 'environment', icon: 'plane' },

  // Health
  { id: uuidv4(), name: 'Feeling healthy', category: 'health', icon: 'heart-pulse' },
  { id: uuidv4(), name: 'Sick', category: 'health', icon: 'thermometer' },
  { id: uuidv4(), name: 'Pain', category: 'health', icon: 'activity' },
  { id: uuidv4(), name: 'Headache', category: 'health', icon: 'frown' },
  { id: uuidv4(), name: 'Medication', category: 'health', icon: 'pill' },
  { id: uuidv4(), name: 'Doctor visit', category: 'health', icon: 'stethoscope' },
  { id: uuidv4(), name: 'Recovery', category: 'health', icon: 'trending-up' },

  // Hobbies & Leisure
  { id: uuidv4(), name: 'Music', category: 'leisure', icon: 'music' },
  { id: uuidv4(), name: 'Gaming', category: 'leisure', icon: 'gamepad-2' },
  { id: uuidv4(), name: 'Movie/TV', category: 'leisure', icon: 'tv' },
  { id: uuidv4(), name: 'Art/Crafts', category: 'leisure', icon: 'palette' },
  { id: uuidv4(), name: 'Cooking', category: 'leisure', icon: 'chef-hat' },
  { id: uuidv4(), name: 'Gardening', category: 'leisure', icon: 'flower-2' },
  { id: uuidv4(), name: 'Photography', category: 'leisure', icon: 'camera' },
  { id: uuidv4(), name: 'Writing', category: 'leisure', icon: 'pen-tool' },

  // Life Events
  { id: uuidv4(), name: 'Good news', category: 'events', icon: 'smile' },
  { id: uuidv4(), name: 'Bad news', category: 'events', icon: 'frown' },
  { id: uuidv4(), name: 'Celebration', category: 'events', icon: 'cake' },
  { id: uuidv4(), name: 'Financial stress', category: 'events', icon: 'wallet' },
  { id: uuidv4(), name: 'Unexpected event', category: 'events', icon: 'zap' },
  { id: uuidv4(), name: 'Routine day', category: 'events', icon: 'repeat' },

  // Stoic Practices
  { id: uuidv4(), name: 'Morning routine', category: 'stoic', icon: 'sunrise' },
  { id: uuidv4(), name: 'Evening reflection', category: 'stoic', icon: 'sunset' },
  { id: uuidv4(), name: 'Practiced virtue', category: 'stoic', icon: 'shield' },
  { id: uuidv4(), name: 'Negative visualization', category: 'stoic', icon: 'eye' },
  { id: uuidv4(), name: 'Voluntary discomfort', category: 'stoic', icon: 'flame' },
  { id: uuidv4(), name: 'Memento mori', category: 'stoic', icon: 'hourglass' },
  { id: uuidv4(), name: 'Amor fati', category: 'stoic', icon: 'infinity' },
  { id: uuidv4(), name: 'Dichotomy of control', category: 'stoic', icon: 'git-branch' },
];
