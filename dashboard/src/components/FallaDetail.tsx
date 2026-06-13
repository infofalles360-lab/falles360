import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import { type Falla } from '../data';
import { cn } from '../utils/cn';
import { fetchDashboardEvents, hasValidCoordinates, updateAdminFallaContent, type AdminFallaUpdatePayload, type DashboardEvent } from '../utils/publicApp';

type ArticleSection = 'summary' | 'facts' | 'location' | 'events';

interface FallaDetailProps {
  falla: Falla | null;
  isDarkMode: boolean;
  onClose: () => void;
  onNavigateToFalla: (falla: Falla) => void;
  onRegisterVisit: (falla: Falla) => void;
  onContentRead?: (falla: Falla) => void;
  onSelectTab: (tab: string) => void;
  favorites: string[];
  toggleFavorite: (id: string, e?: React.MouseEvent) => void;
  isVisited?: boolean;
  canEditContent?: boolean;
  onFallaUpdated?: (falla: Falla) => void;
}

type FallaEditFormState = AdminFallaUpdatePayload;

function mapFallaToEditForm(falla: Falla): FallaEditFormState {
  return {
    id: falla.id,
    name: falla.name,
    description: falla.description,
    section_name: falla.section,
    category: falla.category === 'Infantil' ? 'infantil' : falla.category === 'Experimental' ? 'experimental' : 'principal',
    address: falla.address ?? '',
    neighborhood: falla.neighborhood ?? '',
    latitude: Number.isFinite(falla.lat) ? String(falla.lat) : '0',
    longitude: Number.isFinite(falla.lng) ? String(falla.lng) : '0',
    artist_name: falla.artist ?? '',
    commission_name: falla.commissionName ?? '',
    prize_text: falla.prizeText ?? '',
    image_url: falla.imageUrl ?? '',
    status: falla.status ?? 'active',
    year: falla.year ?? '',
  };
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function formatNumber(value?: number): string {
  if (!Number.isFinite(value) || typeof value !== 'number') {
    return '0';
  }

  return new Intl.NumberFormat('es-ES').format(Math.max(0, value));
}

function splitArtists(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return 'Artista pendiente';
  }

  const parts = normalized
    .split(/\s+(?:y|&)\s+|,\s+|\s*\/\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts.slice(0, 2).join(' y ') : normalized;
}

function detailPrize(falla: Falla): string {
  if (falla.prizeText) {
    return falla.prizeText;
  }

  if (falla.prize) {
    return `#${falla.prize} premio`;
  }

  return 'Sin premio registrado';
}

function resolveStatusLabel(status?: string): string {
  const normalized = normalizeComparable(status || '');

  if (!normalized) {
    return 'Sin estado publico';
  }

  if (normalized === 'active') {
    return 'Activa';
  }

  if (normalized === 'draft') {
    return 'Borrador';
  }

  if (normalized === 'archived') {
    return 'Archivada';
  }

  return status || 'Sin estado publico';
}

function formatEventDate(value: string): string {
  if (!value) {
    return 'Fecha pendiente';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
  }).format(date);
}

function formatEventTime(event: DashboardEvent): string {
  if (event.startTime && event.endTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.startTime || event.endTime || 'Horario pendiente';
}

function buildArticleParagraphs(
  falla: Falla,
  artists: string,
  sectionLabel: string,
  prizeLabel: string,
  statusLabel: string
): string[] {
  const location = falla.address || falla.neighborhood || 'Valencia';
  const yearLabel = falla.year || 'el ejercicio actual';
  const favoritesLabel = falla.favoritesCount ? `${formatNumber(falla.favoritesCount)} personas la han guardado` : 'todavia no suma favoritos visibles';
  const eventsLabel = falla.eventsCount ? `y ${formatNumber(falla.eventsCount)} actos aparecen asociados` : 'y por ahora no tiene actos asociados';

  return [
    falla.description || `${falla.name} ya esta disponible dentro del archivo fallero de la app.`,
    `La comision ${falla.commissionName || falla.name} figura en ${sectionLabel.toLowerCase()} durante ${yearLabel}. La autoria vinculada a esta ficha corresponde a ${artists}.`,
    `Dentro de la informacion publicada, el monumento consta con ${prizeLabel.toLowerCase()} y un estado marcado como ${statusLabel.toLowerCase()}. Se localiza en ${location}.`,
    `En el recorrido digital de Falles360, ${favoritesLabel} ${eventsLabel}. Desde esta pagina puedes pasar directamente al mapa, validar la visita o abrir la agenda completa.`,
  ];
}

function sectionButton(label: string, isActive: boolean, onClick: () => void, isDarkMode: boolean) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200',
        isActive
          ? 'border-brand bg-brand text-white shadow-[0_16px_34px_rgba(255,99,33,0.26)]'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/[0.1]'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      )}
    >
      {label}
    </button>
  );
}

function infoRow(label: string, value: string, isDarkMode: boolean, isLast = false) {
  return (
    <div
      className={cn(
        'grid grid-cols-[104px_minmax(0,1fr)] gap-4 py-3 text-sm',
        !isLast && (isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200')
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">{label}</span>
      <span className={cn('font-bold leading-6', isDarkMode ? 'text-white/86' : 'text-slate-900')}>{value}</span>
    </div>
  );
}

export function FallaDetail({
  falla,
  isDarkMode,
  onClose,
  onNavigateToFalla,
  onRegisterVisit,
  onContentRead,
  onSelectTab,
  favorites,
  toggleFavorite,
  isVisited = false,
  canEditContent = false,
  onFallaUpdated,
}: FallaDetailProps) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const summaryRef = React.useRef<HTMLElement | null>(null);
  const factsRef = React.useRef<HTMLElement | null>(null);
  const locationRef = React.useRef<HTMLElement | null>(null);
  const eventsRef = React.useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = React.useState<ArticleSection>('summary');
  const [relatedEvents, setRelatedEvents] = React.useState<DashboardEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = React.useState(false);
  const [eventsError, setEventsError] = React.useState<string | null>(null);
  const [trackedReadFallaId, setTrackedReadFallaId] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState<FallaEditFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editNotice, setEditNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setActiveSection('summary');
    setRelatedEvents([]);
    setEventsError(null);
    setIsEventsLoading(false);
    setTrackedReadFallaId(null);
    setIsEditorOpen(false);
    setEditNotice(null);
    setEditForm(falla ? mapFallaToEditForm(falla) : null);
  }, [falla?.id]);

  React.useEffect(() => {
    if (!falla) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [falla, onClose]);

  React.useEffect(() => {
    if (!falla) {
      return;
    }

    let isCancelled = false;
    setIsEventsLoading(true);
    setEventsError(null);

    fetchDashboardEvents()
      .then((items) => {
        if (isCancelled) {
          return;
        }

        const fallaNameKey = normalizeComparable(falla.name);
        const commissionKey = normalizeComparable(falla.commissionName || '');
        setRelatedEvents(
          items.filter((item) => {
            const itemKey = normalizeComparable(item.fallaName);
            return itemKey === fallaNameKey || (commissionKey !== '' && itemKey === commissionKey);
          })
        );
      })
      .catch(() => {
        if (!isCancelled) {
          setRelatedEvents([]);
          setEventsError('No se han podido cargar los eventos ahora mismo.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsEventsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [falla]);

  React.useEffect(() => {
    if (!falla || trackedReadFallaId === falla.id || !onContentRead) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onContentRead(falla);
      setTrackedReadFallaId(falla.id);
    }, 6500);

    return () => window.clearTimeout(timeoutId);
  }, [falla, onContentRead, trackedReadFallaId]);

  if (!falla) {
    return null;
  }

  const artists = splitArtists(falla.artist);
  const prizeLabel = detailPrize(falla);
  const sectionLabel = falla.section ? `Seccion ${falla.section}` : 'Sin seccion';
  const yearLabel = falla.year || 'Ejercicio actual';
  const statusLabel = resolveStatusLabel(falla.status);
  const budgetLabel = falla.budgetLabel || (typeof falla.budgetEur === 'number' ? `${new Intl.NumberFormat('es-ES').format(falla.budgetEur)} EUR` : 'No indicado');
  const imageUrl = falla.detailImageUrl ?? falla.imageUrl;
  const isFavorite = favorites.includes(falla.id);
  const locationLabel = falla.address || falla.neighborhood || 'Valencia';
  const coordinateLabel = hasValidCoordinates(falla) ? `${falla.lat.toFixed(5)}, ${falla.lng.toFixed(5)}` : 'Coordenadas pendientes';
  const visitLabel = isVisited ? 'Validada en tu pasaporte' : 'Pendiente de validar';
  const articleParagraphs = buildArticleParagraphs(falla, artists, sectionLabel, prizeLabel, statusLabel);
  const leadText = `${falla.name} recoge en esta ficha toda la informacion principal del monumento, adaptada al formato de consulta editorial de Falles360.`;
  const refs: Record<ArticleSection, React.RefObject<HTMLElement | null>> = {
    summary: summaryRef,
    facts: factsRef,
    location: locationRef,
    events: eventsRef,
  };
  const navItems: Array<{ id: ArticleSection; label: string; index: string }> = [
    { id: 'summary', label: 'Resumen', index: '01' },
    { id: 'facts', label: 'Ficha', index: '02' },
    { id: 'location', label: 'Ubicacion', index: '03' },
    { id: 'events', label: 'Agenda', index: '04' },
  ];

  const jumpTo = (section: ArticleSection) => {
    setActiveSection(section);
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateEditField = (field: keyof FallaEditFormState, value: string) => {
    setEditForm((current) => current ? { ...current, [field]: value } : current);
  };

  const handleSaveEdit = async () => {
    if (!editForm || !canEditContent) {
      return;
    }

    setIsSavingEdit(true);
    setEditNotice(null);

    try {
      const updatedFalla = await updateAdminFallaContent(editForm);
      setEditForm(mapFallaToEditForm(updatedFalla));
      onFallaUpdated?.(updatedFalla);
      setEditNotice('Contenido guardado correctamente.');
    } catch (error) {
      setEditNotice(error instanceof Error && error.message === 'ADMIN_REQUIRED'
        ? 'No tienes permisos para editar este contenido.'
        : 'No se pudo guardar el contenido.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const shellPanelClass = cn(
    'rounded-[2rem] border shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl',
    isDarkMode ? 'border-white/10 bg-[#07111f]/84 text-white' : 'border-white/80 bg-[rgba(255,255,255,0.84)] text-slate-950'
  );
  const sectionCardClass = cn(
    'relative overflow-hidden rounded-[2rem] border p-5 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6',
    isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/88'
  );
  const nestedCardClass = cn(
    'rounded-[1.35rem] border p-4 sm:p-5',
    isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/80 bg-slate-50/80'
  );
  const dividerClass = isDarkMode ? 'border-white/10' : 'border-slate-200';
  const bodyCopyClass = isDarkMode ? 'text-white/76' : 'text-slate-700';
  const mutedCopyClass = isDarkMode ? 'text-white/58' : 'text-slate-500';
  const titleCopyClass = isDarkMode ? 'text-white' : 'text-slate-950';
  const tertiaryActionClass = cn(
    'inline-flex items-center justify-center gap-2 rounded-[1.1rem] border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
    isDarkMode ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  );
  const editInputClass = cn(
    'rounded-[0.95rem] border px-3 py-2.5 outline-none transition-colors',
    isDarkMode ? 'border-white/10 bg-slate-950/70 text-white focus:border-brand/70' : 'border-slate-200 bg-white text-slate-950 focus:border-brand/60'
  );
  const editSectionClass = cn(
    'rounded-[1.35rem] border p-4',
    isDarkMode ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200/80 bg-white/78'
  );

  const renderEditorInput = (field: keyof FallaEditFormState, label: string, type = 'text') => (
    <label className="grid gap-1.5 text-sm font-bold">
      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-brand">{label}</span>
      <input
        type={type}
        value={editForm?.[field] ?? ''}
        onChange={(event) => updateEditField(field, event.target.value)}
        className={editInputClass}
      />
    </label>
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        className={cn(
          'fixed inset-0 z-[5200] overflow-y-auto backdrop-blur-xl',
          isDarkMode ? 'bg-[rgba(2,6,23,0.72)] text-white' : 'bg-[rgba(226,232,240,0.46)] text-slate-950'
        )}
      >
        <div
          className={cn(
            'min-h-full',
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,99,33,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_26%),linear-gradient(180deg,#07101a_0%,#050912_100%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(255,99,33,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_30%),linear-gradient(180deg,#eef3f8_0%,#f7fafc_42%,#edf2f7_100%)]'
          )}
        >
          <header className="sticky top-0 z-30 px-3 py-3 sm:px-5 sm:py-4">
            <div className={cn(shellPanelClass, 'mx-auto flex max-w-[1360px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5')}>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition-all',
                  isDarkMode ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1 lg:flex-none">
                <p className={cn('truncate text-[1.15rem] font-black leading-none tracking-tight', titleCopyClass)}>FallesArchive</p>
                <p className="mt-1 hidden truncate text-[10px] font-black uppercase tracking-[0.18em] text-brand sm:block">The fallera encyclopedia</p>
              </div>

              <nav className="ml-3 hidden items-center gap-2 lg:flex">
                {navItems.map((item) => sectionButton(item.label, activeSection === item.id, () => jumpTo(item.id), isDarkMode))}
              </nav>

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <div
                  className={cn(
                    'hidden items-center gap-2 rounded-[1rem] border px-4 py-2.5 text-sm font-bold md:flex',
                    isDarkMode ? 'border-white/10 bg-white/[0.06] text-white/52' : 'border-slate-200 bg-white text-slate-400'
                  )}
                >
                  <Search className="h-4 w-4" />
                  Buscar falla
                </div>

                <button
                  type="button"
                  onClick={() => toggleFavorite(falla.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-[1rem] border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all sm:px-4',
                    isFavorite
                      ? 'border-brand bg-brand text-white shadow-[0_18px_40px_rgba(255,99,33,0.28)]'
                      : isDarkMode
                        ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  <span className="hidden sm:inline">{isFavorite ? 'Guardada' : 'Guardar'}</span>
                </button>

                {canEditContent ? (
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen((current) => !current)}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-[1rem] border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all sm:px-4',
                      isEditorOpen
                        ? 'border-brand bg-brand text-white shadow-[0_18px_40px_rgba(255,99,33,0.28)]'
                        : isDarkMode
                          ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span className="hidden sm:inline">Editar</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition-all',
                    isDarkMode ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                  aria-label="Cerrar detalle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1360px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
            {canEditContent && isEditorOpen && editForm ? (
              <section className={cn(shellPanelClass, 'mb-6 p-4 sm:p-5')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Modo administrador</p>
                    <h2 className={cn('mt-1 text-[1.45rem] font-black tracking-tight', titleCopyClass)}>Editar contenido de la falla</h2>
                    <p className={cn('mt-1 text-sm font-semibold', mutedCopyClass)}>Solo visible para usuarios con rol admin/support.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="inline-flex items-center justify-center rounded-[1rem] bg-brand px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(255,99,33,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>

                {editNotice ? (
                  <p className={cn('mt-3 rounded-[1rem] border px-4 py-3 text-sm font-bold', isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-white')}>{editNotice}</p>
                ) : null}

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className={editSectionClass}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Resumen</p>
                    <div className="mt-3 grid gap-3">
                      {renderEditorInput('name', 'Titulo / nombre')}
                      <label className="grid gap-1.5 text-sm font-bold">
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-brand">Texto de resumen / descripcion</span>
                        <textarea
                          value={editForm.description}
                          onChange={(event) => updateEditField('description', event.target.value)}
                          rows={8}
                          className={editInputClass}
                        />
                      </label>
                    </div>
                  </div>

                  <div className={editSectionClass}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Ficha</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {renderEditorInput('section_name', 'Seccion')}
                      {renderEditorInput('year', 'Ejercicio')}
                      {renderEditorInput('commission_name', 'Comision')}
                      {renderEditorInput('artist_name', 'Artista')}
                      {renderEditorInput('prize_text', 'Premio')}
                      <label className="grid gap-1.5 text-sm font-bold">
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-brand">Categoria</span>
                        <select
                          value={editForm.category}
                          onChange={(event) => updateEditField('category', event.target.value)}
                          className={editInputClass}
                        >
                          <option value="principal">Principal</option>
                          <option value="infantil">Infantil</option>
                          <option value="experimental">Experimental</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className={editSectionClass}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Ubicacion</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">{renderEditorInput('address', 'Direccion')}</div>
                      {renderEditorInput('neighborhood', 'Barrio')}
                      {renderEditorInput('latitude', 'Latitud', 'number')}
                      {renderEditorInput('longitude', 'Longitud', 'number')}
                    </div>
                  </div>

                  <div className={editSectionClass}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Imagen y publicacion</p>
                    <div className="mt-3 grid gap-3">
                      {renderEditorInput('image_url', 'URL de imagen')}
                      {renderEditorInput('status', 'Estado publico')}
                      {editForm.image_url ? (
                        <div className="overflow-hidden rounded-[1rem] border border-white/20">
                          <img src={editForm.image_url} alt="Preview" className="h-36 w-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[82px_minmax(0,1fr)]">
              <aside className="hidden pt-8 lg:flex">
                <div className="flex w-full flex-col items-center gap-4">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => jumpTo(item.id)}
                      className={cn(
                        'inline-flex h-11 w-11 items-center justify-center rounded-full border text-[10px] font-black tracking-[0.16em] transition-all',
                        activeSection === item.id
                          ? 'border-brand bg-brand text-white shadow-[0_16px_34px_rgba(255,99,33,0.26)]'
                          : isDarkMode
                            ? 'border-white/10 bg-white/[0.06] text-white/58 hover:bg-white/[0.1]'
                            : 'border-white/80 bg-white text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      {item.index}
                    </button>
                  ))}
                </div>
              </aside>

              <motion.article
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.24 }}
                className="min-w-0"
              >
                <div className={cn(sectionCardClass, 'px-5 py-8 sm:px-8 sm:py-10')}>
                  <div className="pointer-events-none absolute -right-14 -top-12 h-40 w-40 rounded-full bg-brand/14 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-sky-400/12 blur-3xl" />

                  <div className="relative mx-auto max-w-[880px] text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                      <BookOpen className="h-3.5 w-3.5" />
                      Falla destacada
                    </div>
                    <p className={cn('mt-4 text-[11px] font-black uppercase tracking-[0.22em]', mutedCopyClass)}>
                      {sectionLabel} | {yearLabel}
                    </p>
                    <h1 className={cn('mt-4 text-[clamp(2.8rem,7vw,4.8rem)] font-black leading-[0.92] tracking-[-0.05em]', titleCopyClass)}>
                      {falla.name}
                    </h1>
                    <p className={cn('mt-4 text-sm font-bold', mutedCopyClass)}>Falles360 | archivo editorial de consulta</p>
                    <p className={cn('mx-auto mt-8 max-w-[760px] text-[1.05rem] font-medium leading-8', bodyCopyClass)}>{leadText}</p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                      {sectionButton('Table of Content', false, () => jumpTo('facts'), isDarkMode)}
                      {sectionButton('Summary', false, () => jumpTo('summary'), isDarkMode)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-6">
                    <section ref={summaryRef} className={sectionCardClass}>
                      <div className={cn('border-b pb-4', dividerClass)}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Summary</p>
                        <h2 className={cn('mt-2 text-[1.9rem] font-black tracking-tight', titleCopyClass)}>Resumen</h2>
                      </div>

                      <div className="mt-6 space-y-5">
                        {articleParagraphs.map((paragraph, index) => (
                          <p key={`${falla.id}-paragraph-${index}`} className={cn('text-[15px] font-medium leading-8', bodyCopyClass)}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>

                    <section ref={factsRef} className={sectionCardClass}>
                      <div className={cn('border-b pb-4', dividerClass)}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Dossier</p>
                        <h2 className={cn('mt-2 text-[1.9rem] font-black tracking-tight', titleCopyClass)}>Ficha de la falla</h2>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className={nestedCardClass}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Comision</p>
                          <p className={cn('mt-3 text-[1.15rem] font-black tracking-tight', titleCopyClass)}>{falla.commissionName || falla.name}</p>
                        </div>
                        <div className={nestedCardClass}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Artistas</p>
                          <p className={cn('mt-3 text-[1.15rem] font-black tracking-tight', titleCopyClass)}>{artists}</p>
                        </div>
                        <div className={nestedCardClass}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Premio</p>
                          <p className={cn('mt-3 text-[1.15rem] font-black tracking-tight', titleCopyClass)}>{prizeLabel}</p>
                        </div>
                        <div className={nestedCardClass}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Estado</p>
                          <p className={cn('mt-3 text-[1.15rem] font-black tracking-tight', titleCopyClass)}>{statusLabel}</p>
                        </div>
                      </div>
                    </section>

                    <section ref={locationRef} className={sectionCardClass}>
                      <div className={cn('border-b pb-4', dividerClass)}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Location</p>
                        <h2 className={cn('mt-2 text-[1.9rem] font-black tracking-tight', titleCopyClass)}>Ubicacion y visita</h2>
                      </div>

                      <div className="mt-6 space-y-5">
                        <p className={cn('text-[15px] font-medium leading-8', bodyCopyClass)}>
                          La ficha situa el monumento en {locationLabel}. Desde esta vista puedes saltar directamente al mapa para navegar hasta la falla, abrir la ruta externa o validar que ya has pasado por ella.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className={nestedCardClass}>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Direccion</p>
                            <p className={cn('mt-3 text-[15px] font-medium leading-7', titleCopyClass)}>{falla.address || 'Direccion pendiente'}</p>
                          </div>
                          <div className={nestedCardClass}>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Coordenadas</p>
                            <p className={cn('mt-3 text-[15px] font-medium leading-7', titleCopyClass)}>{coordinateLabel}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={() => onNavigateToFalla(falla)} className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-brand px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(255,99,33,0.28)] transition-all hover:bg-[#f45518]">
                            <Navigation className="h-4 w-4" />
                            Abrir guiado
                          </button>

                          {falla.routeUrl ? (
                            <button
                              type="button"
                              onClick={() => typeof window !== 'undefined' && window.open(falla.routeUrl, '_blank', 'noopener,noreferrer')}
                              className={tertiaryActionClass}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir en Maps
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => onRegisterVisit(falla)}
                            className={cn(
                              tertiaryActionClass,
                              isVisited && 'border-brand bg-brand/12 text-brand'
                            )}
                          >
                            <MapPin className="h-4 w-4" />
                            {isVisited ? 'Visita validada' : 'Validar visita'}
                          </button>
                        </div>
                      </div>
                    </section>

                    <section ref={eventsRef} className={sectionCardClass}>
                      <div className={cn('border-b pb-4', dividerClass)}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Agenda</p>
                        <h2 className={cn('mt-2 text-[1.9rem] font-black tracking-tight', titleCopyClass)}>Actos relacionados</h2>
                      </div>

                      <div className="mt-6">
                        {isEventsLoading ? (
                          <div className={cn(nestedCardClass, bodyCopyClass)}>Cargando eventos de esta falla...</div>
                        ) : null}

                        {!isEventsLoading && eventsError ? (
                          <div className={cn(nestedCardClass, bodyCopyClass)}>{eventsError}</div>
                        ) : null}

                        {!isEventsLoading && !eventsError && relatedEvents.length === 0 ? (
                          <div className={cn(nestedCardClass, bodyCopyClass)}>
                            {falla.eventsCount ? 'Hay actos asociados, pero todavia no existe detalle enlazado en esta ficha.' : 'Esta falla no tiene actos asociados por ahora.'}
                          </div>
                        ) : null}

                        {!isEventsLoading && !eventsError && relatedEvents.length > 0 ? (
                          <div className={cn('overflow-hidden rounded-[1.5rem] border', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white/70')}>
                            {relatedEvents.map((event, index) => (
                              <article
                                key={event.id}
                                className={cn(
                                  'p-5',
                                  index !== relatedEvents.length - 1 && (isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200')
                                )}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">{event.categoryName}</p>
                                    <h3 className={cn('mt-2 text-[1.2rem] font-black tracking-tight', titleCopyClass)}>{event.title}</h3>
                                    <p className={cn('mt-3 text-[15px] font-medium leading-7', bodyCopyClass)}>{event.description}</p>
                                  </div>

                                  <div className={cn('text-sm font-bold sm:text-right', mutedCopyClass)}>
                                    <p>{formatEventDate(event.eventDate)}</p>
                                    <p className="mt-1">{formatEventTime(event)}</p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                  <span className={cn('text-sm font-bold', mutedCopyClass)}>
                                    {event.locationName || event.address || 'Ubicacion pendiente'}
                                  </span>
                                  {event.routeUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => typeof window !== 'undefined' && window.open(event.routeUrl, '_blank', 'noopener,noreferrer')}
                                      className={tertiaryActionClass}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Ver ruta
                                    </button>
                                  ) : null}
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectTab('Agenda');
                          }}
                          className={tertiaryActionClass}
                        >
                          <CalendarDays className="h-4 w-4" />
                          Abrir agenda completa
                        </button>
                      </div>
                    </section>
                  </div>
                  
                  <aside className="space-y-6 xl:sticky xl:top-[104px] xl:self-start">
                    <section className={sectionCardClass}>
                      <div className={cn('relative overflow-hidden rounded-[1.7rem] border', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/80')}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={falla.name} className="aspect-[4/5] w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className={cn('flex aspect-[4/5] items-center justify-center text-sm font-black uppercase tracking-[0.16em]', mutedCopyClass)}>
                            Sin imagen disponible
                          </div>
                        )}

                        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-slate-950/78 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                          {sectionLabel}
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/82 via-slate-950/28 to-transparent px-4 pb-4 pt-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Archivo</p>
                          <p className="mt-1 text-lg font-black tracking-tight text-white">{falla.name}</p>
                        </div>
                      </div>

                      <div className="mt-5">
                        {infoRow('Comision', falla.commissionName || falla.name, isDarkMode)}
                        {falla.jcfNum ? infoRow('Numero JCF', falla.jcfNum, isDarkMode) : null}
                        {infoRow('Artista', artists, isDarkMode)}
                        {infoRow('Seccion', sectionLabel, isDarkMode)}
                        {falla.category === 'Infantil' ? infoRow('Presupuesto', budgetLabel, isDarkMode) : null}
                        {falla.city ? infoRow('Ciudad', falla.city, isDarkMode) : null}
                        {infoRow('Ano', yearLabel, isDarkMode)}
                        {infoRow('Premio', prizeLabel, isDarkMode)}
                        {infoRow('Estado', statusLabel, isDarkMode)}
                        {infoRow('Visita', visitLabel, isDarkMode, true)}
                      </div>
                    </section>

                    <section className={sectionCardClass}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Datos de recorrido</p>
                      <div className="mt-4 space-y-3">
                        <div className={nestedCardClass}>
                          <div className="flex items-start gap-3">
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Ubicacion</p>
                              <p className={cn('mt-2 text-sm font-bold leading-6', bodyCopyClass)}>{locationLabel}</p>
                            </div>
                          </div>
                        </div>

                        <div className={nestedCardClass}>
                          <div className="flex items-start gap-3">
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                              <Heart className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Favoritos</p>
                              <p className={cn('mt-2 text-sm font-bold leading-6', bodyCopyClass)}>
                                {falla.favoritesCount ? `${formatNumber(falla.favoritesCount)} guardados` : 'Sin guardados visibles'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={nestedCardClass}>
                          <div className="flex items-start gap-3">
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                              <CalendarDays className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Actos</p>
                              <p className={cn('mt-2 text-sm font-bold leading-6', bodyCopyClass)}>
                                {falla.eventsCount ? `${formatNumber(falla.eventsCount)} eventos asociados` : 'Sin actos asociados'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </motion.article>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
