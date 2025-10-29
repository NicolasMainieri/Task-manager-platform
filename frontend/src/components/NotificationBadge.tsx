import React from 'react';

interface NotificationBadgeProps {
  count: number;
  max?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, max = 99 }) => {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-800 animate-pulse">
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
