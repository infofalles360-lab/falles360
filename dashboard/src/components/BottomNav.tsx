import React from 'react';
import { Map as MapIcon, Calendar, Bot, Flame, ShoppingBag } from 'lucide-react';
import { cn } from '../utils/cn';

interface BottomNavProps {
  isDarkMode: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant?: 'default' | 'map';
}

export function BottomNav({ isDarkMode, activeTab, setActiveTab, variant = 'default' }: BottomNavProps) {
  const leftTabs = [
    { label: 'Mapa', target: 'Mapa', icon: MapIcon },
    { label: 'Agenda', target: 'Agenda', icon: Calendar },
  ];
  const rightTabs = [
    { label: 'Fallas', target: 'Fallas', icon: Flame },
    { label: 'Marketplace', target: 'Marketplace', icon: ShoppingBag },
  ];

  const isMapVariant = variant === 'map';
  const isFalleritoActive = activeTab === 'Fallerito';
  const renderTab = (item: { label: string; target: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = activeTab === item.target;

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => setActiveTab(item.target)}
        className={cn(
          'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[18px] px-1 outline-none transition-all sm:min-h-[64px]',
          isActive ? 'text-brand' : isDarkMode && !isMapVariant ? 'text-white/72 hover:text-white' : 'text-slate-500 hover:text-slate-700'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-all sm:h-10 sm:w-10',
            isActive
              ? 'bg-[#fff2e9] text-brand shadow-[0_12px_24px_rgba(255,99,33,0.18)]'
              : 'bg-transparent text-current'
          )}
        >
          <item.icon className="h-[17px] w-[17px]" />
        </div>
        <span
          className={cn(
            'max-w-full truncate text-[10px] font-black leading-none sm:text-[11px]',
            isActive ? 'text-brand' : isDarkMode && !isMapVariant ? 'text-white/66' : 'text-slate-600'
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };
  const falleritoButton = (
    <button
      type="button"
      onClick={() => setActiveTab('Fallerito')}
      className={cn(
        'absolute left-1/2 top-[-1.5rem] z-10 flex w-[80px] -translate-x-1/2 flex-col items-center justify-center gap-1.5 outline-none transition-all sm:top-[-1.8rem] sm:w-[92px]',
        isFalleritoActive ? 'scale-105' : 'hover:scale-[1.03]'
      )}
      aria-current={isFalleritoActive ? 'page' : undefined}
    >
      <span
        className={cn(
          'grid h-[60px] w-[60px] place-items-center rounded-full border-[4px] shadow-[0_18px_36px_rgba(255,99,33,0.26)] transition-all sm:h-[68px] sm:w-[68px]',
          isFalleritoActive
            ? (isMapVariant || !isDarkMode ? 'border-[#fff4ec] bg-[#fff8f3] text-brand' : 'border-slate-900 bg-brand text-white')
            : isMapVariant || !isDarkMode
              ? 'border-[#eef3f7] bg-brand text-white'
              : 'border-slate-900 bg-brand text-white'
        )}
      >
        <Bot className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <span className={cn('max-w-full truncate text-[10px] font-black leading-none sm:text-[11px]', isFalleritoActive ? 'text-brand' : isDarkMode && !isMapVariant ? 'text-white/72' : 'text-slate-600')}>
        Fallerito
      </span>
    </button>
  );

  if (isMapVariant) {
    return (
      <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.55rem)] left-1/2 z-[5000] w-[min(92vw,480px)] -translate-x-1/2 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)]">
        <div className="relative rounded-[1.8rem] border border-[#f3e2d7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,240,0.98))] px-2.5 py-2 shadow-[0_20px_44px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:rounded-[2rem]">
          {falleritoButton}
          <div className="flex items-center gap-0">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
              {leftTabs.map(renderTab)}
            </div>
            <span aria-hidden="true" className="block w-[80px] shrink-0 sm:w-[92px]" />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
              {rightTabs.map(renderTab)}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
      <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.55rem)] left-1/2 z-[5000] w-[min(92vw,480px)] -translate-x-1/2 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)]">
      <div
        className={cn(
          'relative rounded-[1.8rem] border px-2.5 py-2 shadow-[0_20px_44px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all sm:rounded-[2rem]',
          isDarkMode
            ? 'border-white/12 bg-[linear-gradient(180deg,rgba(30,41,59,0.94),rgba(15,23,42,0.92))]'
            : 'border-[#f3e2d7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,240,0.98))]'
        )}
      >
        {falleritoButton}
        <div className="flex items-center gap-0">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
            {leftTabs.map(renderTab)}
          </div>
          <span aria-hidden="true" className="block w-[80px] shrink-0 sm:w-[92px]" />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
            {rightTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </nav>
  );
}
