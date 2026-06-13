import { Award, BookOpen, Compass, LockKeyhole, MapPin, Radio, Route, Sparkles, Trophy } from 'lucide-react';
import type { GamificationBundle, GamificationStats } from '../../utils/gamification';
import { cn } from '../../utils/cn';
import { ProgressBar } from './ProgressBar';

interface GamificationProfilePanelProps {
  isDarkMode: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  bundle: GamificationBundle | null;
  stats: GamificationStats | null;
}

export function GamificationProfilePanel({
  isDarkMode,
  isGuest,
  isLoading,
  error,
  bundle,
  stats,
}: GamificationProfilePanelProps) {
  const shellClassName = cn(
    'rounded-[1.5rem] border shadow-[0_18px_46px_rgba(15,23,42,0.08)]',
    isDarkMode ? 'border-white/10 bg-slate-950/78' : 'border-slate-200/80 bg-white'
  );

  if (isGuest) {
    return (
      <section className={cn(shellClassName, 'overflow-hidden p-6 sm:p-8')}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">Pasaporte fallero</p>
            <h3 className="mt-3 max-w-3xl text-[1.8rem] font-black leading-tight">Registrate para guardar progreso real, insignias y visitas verificadas.</h3>
            <p className={cn('mt-3 max-w-2xl text-sm font-bold leading-6', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
              La gamificacion queda disponible para cuentas registradas porque valida visitas, guarda XP y sincroniza actividad entre sesiones.
            </p>
          </div>
          <div className={cn('rounded-[1.25rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-brand/10 text-brand">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-black">Progreso bloqueado</p>
            <p className={cn('mt-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/55' : 'text-slate-500')}>XP, rutas e insignias se activan al iniciar sesion.</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading && !bundle) {
    return <section className={cn(shellClassName, 'p-6 text-sm font-bold')}>Cargando progreso gamificado...</section>;
  }

  if (error && !bundle) {
    return <section className={cn(shellClassName, 'p-6 text-sm font-bold')}>{error}</section>;
  }

  if (!bundle) {
    return null;
  }

  const summaryItems = [
    { label: 'Fallas', value: bundle.profile.totals.distinctFallasVisited, icon: MapPin },
    { label: 'Rutas', value: bundle.profile.totals.routesCompleted, icon: Route },
    { label: 'Barrios', value: bundle.profile.totals.neighborhoodsExplored, icon: Compass },
    { label: 'Lecturas', value: bundle.profile.totals.contentReadsCount, icon: BookOpen },
  ];

  return (
    <section className={cn(shellClassName, 'grid overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)_320px]')}>
      <article className={cn('relative min-h-[250px] p-6 sm:p-8', isDarkMode ? 'border-white/10' : 'border-slate-200/80', 'lg:border-r')}>
        <div className="pointer-events-none absolute bottom-5 right-6 text-brand/10">
          <Trophy className="h-28 w-28" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">Nivel actual</p>
          <h3 className="mt-2 text-[1.9rem] font-black leading-none tracking-tight">{bundle.profile.level.name}</h3>
          <p className={cn('mt-2 text-sm font-bold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
            Nivel {bundle.profile.level.number} del pasaporte fallero.
          </p>

          <div className={cn('mt-7 grid grid-cols-2 gap-3')}>
            <div className={cn('rounded-[1rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
              <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>XP acumulada</p>
              <p className="mt-2 text-[1.55rem] font-black leading-none">{bundle.profile.xpTotal}</p>
            </div>
            <div className={cn('rounded-[1rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
              <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>Insignias</p>
              <p className="mt-2 text-[1.55rem] font-black leading-none">{bundle.profile.totals.badgesUnlocked}</p>
            </div>
          </div>

          <div className="mt-7">
            <ProgressBar value={bundle.profile.level.progressPercent} isDarkMode={isDarkMode} label="Progreso al siguiente nivel" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[12px] font-bold text-brand">
            <Sparkles className="h-4 w-4" />
            {bundle.profile.level.nextLevelXp !== null
              ? `${Math.max(0, bundle.profile.level.nextLevelXp - bundle.profile.xpTotal)} XP para el siguiente rango`
              : 'Nivel maximo actual alcanzado'}
          </div>
        </div>
      </article>

      <article className={cn('p-6 sm:p-8', isDarkMode ? 'border-white/10' : 'border-slate-200/80', 'lg:border-r')}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">Tu pasaporte avanza</p>
        <h3 className="mt-3 text-[1.45rem] font-black leading-tight">Exploracion real, progreso real.</h3>

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>Progreso global</p>
            <p className="mt-2 text-[1.6rem] font-black leading-none">{bundle.profile.progress.totalProgressPercent.toFixed(0)}%</p>
            <div className="mt-4">
              <ProgressBar value={bundle.profile.progress.totalProgressPercent} isDarkMode={isDarkMode} />
            </div>
          </div>
          <div>
            <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>Fallas cubiertas</p>
            <p className="mt-2 text-[1.6rem] font-black leading-none">{bundle.profile.progress.fallasCompletionPercent.toFixed(0)}%</p>
            <div className="mt-4">
              <ProgressBar value={bundle.profile.progress.fallasCompletionPercent} isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Premiadas', value: stats?.context.visited_prized_fallas ?? 0, icon: Award },
            { label: 'Especial', value: stats?.context.visited_special_section_fallas ?? 0, icon: Sparkles },
            { label: 'Insignias', value: bundle.profile.totals.badgesUnlocked, icon: Trophy },
          ].map((item) => {
            const Icon = item.icon;
            return (
            <div key={item.label} className={cn('rounded-[1rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
              <Icon className="h-4 w-4 text-brand" />
              <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>{item.label}</p>
              <p className="mt-2 text-[1.25rem] font-black leading-none">{item.value}</p>
            </div>
            );
          })}
        </div>

        <p className={cn('mt-5 flex items-center gap-2 text-[12px] font-bold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
          <Radio className="h-4 w-4 text-brand" />
          La coleccion de insignias se abre desde el icono del encabezado.
        </p>
      </article>

      <article className="p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">Resumen rapido</p>
        <div className={cn('mt-6 divide-y', isDarkMode ? 'divide-white/10' : 'divide-slate-200/80')}>
          {summaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Icon className="h-4.5 w-4.5 text-brand" />
                  <span className={cn('text-sm font-bold', isDarkMode ? 'text-white/62' : 'text-slate-500')}>{item.label}</span>
                </div>
                <span className="text-sm font-black">{item.value}</span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
