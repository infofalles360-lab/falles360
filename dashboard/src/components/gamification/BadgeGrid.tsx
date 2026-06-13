import type { GamificationBadge } from '../../utils/gamification';
import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  badges: GamificationBadge[];
  isDarkMode: boolean;
}

export function BadgeGrid({ badges, isDarkMode }: BadgeGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => (
        <BadgeCard key={badge.slug} badge={badge} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
}
