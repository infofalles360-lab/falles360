import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera,
  Link2,
  LoaderCircle,
  MapPin,
  Monitor,
  RotateCcw,
  Save,
  SendHorizontal,
  Smartphone,
  Tablet,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { type AppViewer } from '../data';
import { type TelegramLinkStatus } from '../utils/telegram';
import {
  DEVICE_PREVIEW_OPTIONS,
  getDevicePreviewOption,
  type DevicePreviewMode,
} from '../utils/devicePreview';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  viewer: AppViewer;
  isDarkMode: boolean;
  isSaving: boolean;
  saveNotice: string | null;
  saveNoticeTone: 'success' | 'error';
  telegramStatus: TelegramLinkStatus;
  isTelegramStatusLoading: boolean;
  isTelegramLinking: boolean;
  isTelegramSendingTest: boolean;
  telegramNotice: string | null;
  devicePreviewMode: DevicePreviewMode;
  showDevicePreviewTools?: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; location: string; avatar: string }) => void;
  onDevicePreviewModeChange: (mode: DevicePreviewMode) => void;
  onOpenDevicePreview: () => void;
  onConnectTelegram: () => void;
  onRefreshTelegramStatus: () => void;
  onSendTelegramTest: () => void;
}

type AvatarSource = 'auto' | 'preset' | 'upload';
type AvatarVariant = 'auto' | 'sol' | 'foc' | 'nit' | 'mascleta' | 'crema';

const PRESET_VARIANTS: AvatarVariant[] = ['sol', 'foc', 'nit', 'mascleta', 'crema'];
const AVATAR_UPLOAD_MAX_BYTES = 5_000_000;
const AVATAR_UPLOAD_MAX_MB = AVATAR_UPLOAD_MAX_BYTES / 1_000_000;
const AVATAR_EXPORT_MAX_SIZE = 900;
const AVATAR_EXPORT_QUALITY = 0.86;
const DEVICE_PREVIEW_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
} as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo leer la imagen.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo preparar la imagen.'));
    image.src = src;
  });
}

async function prepareAvatarDataUrl(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, AVATAR_EXPORT_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return dataUrl;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', AVATAR_EXPORT_QUALITY);
}

function buildProfileAvatar(name: string, accessType: AppViewer['accessType'], variant: AvatarVariant = 'auto'): string {
  const normalizedName = name.trim() || 'falles360';
  const seed = variant === 'auto'
    ? `${accessType}-${normalizedName}`
    : `${accessType}-${variant}-${normalizedName}`;

  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

function buildHandle(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

  return `@${normalized || 'falles360'}`;
}

export function ProfileSettingsModal({
  isOpen,
  viewer,
  isDarkMode,
  isSaving,
  saveNotice,
  saveNoticeTone,
  telegramStatus,
  isTelegramStatusLoading,
  isTelegramLinking,
  isTelegramSendingTest,
  telegramNotice,
  devicePreviewMode,
  showDevicePreviewTools = true,
  onClose,
  onSave,
  onDevicePreviewModeChange,
  onOpenDevicePreview,
  onConnectTelegram,
  onRefreshTelegramStatus,
  onSendTelegramTest,
}: ProfileSettingsModalProps) {
  const [draftName, setDraftName] = useState(viewer.name);
  const [draftLocation, setDraftLocation] = useState(viewer.location);
  const [draftAvatar, setDraftAvatar] = useState(viewer.avatar);
  const [avatarSource, setAvatarSource] = useState<AvatarSource>('auto');
  const [selectedVariant, setSelectedVariant] = useState<AvatarVariant>('sol');
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const autoAvatar = useMemo(
    () => buildProfileAvatar(draftName, viewer.accessType, 'auto'),
    [draftName, viewer.accessType]
  );

  const presetAvatars = useMemo(
    () =>
      PRESET_VARIANTS.map((variant) => ({
        variant,
        url: buildProfileAvatar(draftName, viewer.accessType, variant),
      })),
    [draftName, viewer.accessType]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftName(viewer.name);
    setDraftLocation(viewer.location);
    setDraftAvatar(viewer.avatar);
    setAvatarNotice(null);

    if (viewer.avatar.startsWith('data:')) {
      setAvatarSource('upload');
      return;
    }

    if (viewer.avatar === buildProfileAvatar(viewer.name, viewer.accessType, 'auto')) {
      setAvatarSource('auto');
      return;
    }

    const matchedPreset = PRESET_VARIANTS.find(
      (variant) => viewer.avatar === buildProfileAvatar(viewer.name, viewer.accessType, variant)
    );

    if (matchedPreset) {
      setAvatarSource('preset');
      setSelectedVariant(matchedPreset);
      return;
    }

    setAvatarSource('upload');
  }, [isOpen, viewer]);

  useEffect(() => {
    if (avatarSource === 'auto') {
      setDraftAvatar(autoAvatar);
    }
  }, [autoAvatar, avatarSource]);

  useEffect(() => {
    if (avatarSource === 'preset') {
      setDraftAvatar(buildProfileAvatar(draftName, viewer.accessType, selectedVariant));
    }
  }, [avatarSource, draftName, selectedVariant, viewer.accessType]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > AVATAR_UPLOAD_MAX_BYTES) {
      setAvatarNotice(`La foto debe pesar menos de ${AVATAR_UPLOAD_MAX_MB} MB.`);
      event.target.value = '';
      return;
    }

    try {
      const nextAvatar = await prepareAvatarDataUrl(file);
      setDraftAvatar(nextAvatar);
      setAvatarSource('upload');
      setAvatarNotice('Foto cargada y optimizada.');
    } catch (error) {
      setAvatarNotice(error instanceof Error ? error.message : 'No se pudo cargar la foto.');
    } finally {
      event.target.value = '';
    }
  };

  const canSave = draftName.trim().length > 0 && draftLocation.trim().length > 0 && draftAvatar.trim().length > 0;
  const telegramStatusLabel = !viewer.isRegistered
    ? 'Solo usuarios'
    : isTelegramStatusLoading
      ? 'Comprobando'
      : telegramStatus.linked
        ? 'Conectado'
        : 'Pendiente';
  const telegramSummary = !viewer.isRegistered
    ? 'Necesitas una cuenta registrada para vincular Telegram.'
    : telegramStatus.linked
      ? `Avisos activos${telegramStatus.telegramUsername ? ` para @${telegramStatus.telegramUsername}` : ''}.`
      : 'Conecta tu bot para recibir avisos y notificaciones fuera de la app.';
  const syncSummary = viewer.isRegistered
    ? 'El nombre se sincroniza con la cuenta. Avatar y ubicacion quedan guardados en este dispositivo.'
    : 'En modo invitado el nombre se conserva en la sesion y el avatar queda ligado a este dispositivo.';
  const activeDevicePreview = getDevicePreviewOption(devicePreviewMode);
  const ActiveDevicePreviewIcon = DEVICE_PREVIEW_ICONS[activeDevicePreview.family];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-2 backdrop-blur-md sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-[1.4rem] border shadow-[0_32px_80px_rgba(15,23,42,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]',
              isDarkMode ? 'border-white/10 bg-[#0b0d11] text-white' : 'border-white bg-[#f8f5ef] text-slate-950'
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Perfil</p>
                <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Configurar perfil</h3>
                <p className="mt-2 hidden text-sm font-bold leading-6 opacity-60 sm:block">
                  Ajusta identidad visible, avatar y conexiones sin salir del dashboard.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar configuracion de perfil"
                onClick={onClose}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors',
                  isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-white hover:bg-gray-50'
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-3 sm:gap-5 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className={cn(
                'rounded-[1.5rem] border p-5',
                isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'
              )}>
                <div className="flex flex-col items-center text-center">
                  <img src={draftAvatar} alt={draftName} className="h-24 w-24 rounded-[1.5rem] object-cover shadow-2xl sm:h-32 sm:w-32 sm:rounded-[2rem]" />
                  <p className="mt-4 text-lg font-black">{draftName.trim() || 'Tu perfil'}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-45">{buildHandle(draftName)}</p>
                  <p className="mt-3 text-sm font-bold opacity-60">{draftLocation.trim() || 'Valencia'}</p>
                </div>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarSource('auto');
                      setDraftAvatar(autoAvatar);
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                      avatarSource === 'auto'
                        ? 'bg-brand text-white'
                        : isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-[#fff3ea] text-brand hover:bg-[#ffe8d8]'
                    )}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Avatar automatico
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                      avatarSource === 'upload'
                        ? 'bg-brand text-white'
                        : isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Subir foto
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {avatarNotice && (
                  <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
                    {avatarNotice}
                  </p>
                )}

                <div className="mt-5 grid gap-2">
                  {[
                    { label: 'Cuenta', value: viewer.isRegistered ? 'Registrada' : 'Invitado' },
                    { label: 'Email', value: viewer.email || 'Sin correo vinculado' },
                    { label: 'Vista', value: `${activeDevicePreview.label} ${activeDevicePreview.width}px` },
                    { label: 'Guardado', value: syncSummary },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'rounded-[1.15rem] border px-3 py-3',
                        isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-slate-50/80'
                      )}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{item.label}</p>
                      <p className="mt-1 text-xs font-black leading-5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className={cn(
                  'rounded-[1.5rem] border p-4',
                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Identidad visible</p>
                      <p className="mt-2 text-sm font-bold leading-6 opacity-65">
                        El perfil enseña tu nombre, handle y ubicacion base en la pestaña principal.
                      </p>
                    </div>
                    <UserRound className="h-5 w-5 text-brand" />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className={cn('rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50')}>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Handle</p>
                      <p className="mt-1 text-sm font-black">{buildHandle(draftName)}</p>
                    </div>
                    <div className={cn('rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50')}>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Cuenta</p>
                      <p className="mt-1 text-sm font-black">{viewer.isRegistered ? 'Cuenta registrada' : 'Modo invitado'}</p>
                    </div>
                    <div className={cn('rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50')}>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Persistencia</p>
                      <p className="mt-1 text-sm font-black">{viewer.isRegistered ? 'Cuenta + dispositivo' : 'Sesion + dispositivo'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
                      <UserRound className="h-4 w-4 text-brand" />
                      Nombre visible
                    </span>
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      maxLength={32}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none transition-colors',
                        isDarkMode ? 'border-white/10 bg-white/5 text-white' : 'border-gray-100 bg-white text-slate-800'
                      )}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
                      <MapPin className="h-4 w-4 text-brand" />
                      Ubicacion
                    </span>
                    <input
                      value={draftLocation}
                      onChange={(event) => setDraftLocation(event.target.value)}
                      maxLength={32}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none transition-colors',
                        isDarkMode ? 'border-white/10 bg-white/5 text-white' : 'border-gray-100 bg-white text-slate-800'
                      )}
                    />
                  </label>
                </div>

                {showDevicePreviewTools ? (
                  <div className={cn(
                    'rounded-[1.5rem] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">Vista del dashboard</p>
                        <p className="mt-2 text-sm font-bold leading-6 opacity-65">
                          Cambia entre moviles, tablet y escritorio y abre una previsualizacion real del dashboard.
                        </p>
                      </div>
                      <ActiveDevicePreviewIcon className="h-5 w-5 shrink-0 text-brand" />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {DEVICE_PREVIEW_OPTIONS.map((option) => {
                        const OptionIcon = DEVICE_PREVIEW_ICONS[option.family];
                        const isActive = devicePreviewMode === option.mode;

                        return (
                          <button
                            key={option.mode}
                            type="button"
                            onClick={() => onDevicePreviewModeChange(option.mode)}
                            className={cn(
                              'rounded-[1.5rem] border px-4 py-4 text-left transition-all',
                              isActive
                                ? 'border-brand bg-brand/10 shadow-[0_0_0_3px_rgba(255,99,33,0.12)]'
                                : isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-white'
                            )}
                          >
                            <div className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-[1rem]',
                              isActive ? 'bg-brand text-white' : isDarkMode ? 'bg-white/8 text-white/72' : 'bg-white text-slate-600'
                            )}>
                              <OptionIcon className="h-4.5 w-4.5" />
                            </div>
                            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">{option.label}</p>
                            <p className="mt-1 text-sm font-black">{option.width} x {option.height}</p>
                            <p className="mt-2 text-xs font-bold leading-5 opacity-60">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-bold leading-5 opacity-60">
                        La ultima vista elegida se recuerda en este dispositivo para abrir la previsualizacion mas rapido.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenDevicePreview}
                        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#f45518]"
                      >
                        <ActiveDevicePreviewIcon className="h-4 w-4" />
                        Abrir previsualizacion
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={cn(
                  'rounded-[1.5rem] border p-4',
                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'
                )}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-brand" />
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">Avatar</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                      isDarkMode ? 'bg-white/8 text-white/70' : 'bg-slate-100 text-slate-600'
                    )}>
                      {avatarSource === 'upload' ? 'Foto local' : avatarSource === 'preset' ? 'Preset' : 'Automatico'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {presetAvatars.map((avatar) => {
                      const isActive = avatarSource === 'preset' && selectedVariant === avatar.variant;

                      return (
                        <button
                          key={avatar.variant}
                          type="button"
                          onClick={() => {
                            setAvatarSource('preset');
                            setSelectedVariant(avatar.variant);
                            setDraftAvatar(avatar.url);
                          }}
                          className={cn(
                            'overflow-hidden rounded-[1.4rem] border p-1 transition-all',
                            isActive
                              ? 'border-brand bg-brand/10 shadow-[0_0_0_3px_rgba(255,99,33,0.18)]'
                              : isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-white'
                          )}
                        >
                          <img src={avatar.url} alt={`Avatar ${avatar.variant}`} className="h-16 w-full rounded-[1rem] object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[11px] font-bold leading-5 opacity-60">
                    Puedes subir fotos de hasta {AVATAR_UPLOAD_MAX_MB} MB. Se optimizan antes de guardarse en este dispositivo para mantener la experiencia rapida.
                  </p>
                </div>

                <div className={cn(
                  'rounded-[1.5rem] border p-4',
                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-brand" />
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">Telegram</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                      telegramStatus.linked
                        ? 'bg-brand/15 text-brand'
                        : isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'
                    )}>
                      {isTelegramStatusLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {telegramStatusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium opacity-70">
                    {telegramSummary}
                  </p>
                  {telegramNotice && (
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-brand">
                      {telegramNotice}
                    </p>
                  )}
                  <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      disabled={!viewer.isRegistered || isTelegramLinking}
                      onClick={onConnectTelegram}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors',
                        !viewer.isRegistered || isTelegramLinking
                          ? 'cursor-not-allowed bg-brand/45'
                          : 'bg-brand hover:bg-[#f45518]'
                      )}
                    >
                      {isTelegramLinking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      {telegramStatus.linked ? 'Reconectar Telegram' : 'Conectar Telegram'}
                    </button>
                    <button
                      type="button"
                      disabled={!viewer.isRegistered || isTelegramStatusLoading}
                      onClick={onRefreshTelegramStatus}
                      className={cn(
                        'rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                        !viewer.isRegistered || isTelegramStatusLoading
                          ? isDarkMode ? 'cursor-not-allowed bg-white/5 text-white/30' : 'cursor-not-allowed bg-slate-100 text-slate-300'
                          : isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      Actualizar estado
                    </button>
                    <button
                      type="button"
                      disabled={!telegramStatus.linked || isTelegramSendingTest}
                      onClick={onSendTelegramTest}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                        !telegramStatus.linked || isTelegramSendingTest
                          ? isDarkMode ? 'cursor-not-allowed bg-white/5 text-white/30' : 'cursor-not-allowed bg-slate-100 text-slate-300'
                          : isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {isTelegramSendingTest ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      Enviar aviso de prueba
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              {saveNotice ? (
                <div
                  className={cn(
                    'mb-4 rounded-[1.15rem] border px-4 py-3 text-sm font-bold leading-6',
                    saveNoticeTone === 'error'
                      ? isDarkMode
                        ? 'border-red-500/25 bg-red-500/12 text-red-100'
                        : 'border-red-200 bg-red-50 text-red-700'
                      : isDarkMode
                        ? 'border-brand/30 bg-brand/12 text-white'
                        : 'border-brand/20 bg-[#fff3ea] text-slate-700'
                  )}
                >
                  {saveNotice}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'w-full rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition-colors sm:w-auto',
                  isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canSave || isSaving}
                onClick={() =>
                  onSave({
                    name: draftName.trim(),
                    location: draftLocation.trim(),
                    avatar: draftAvatar,
                  })
                }
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors sm:w-auto',
                  canSave && !isSaving ? 'bg-brand hover:bg-[#f45518]' : 'cursor-not-allowed bg-brand/45'
                )}
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Guardando perfil' : 'Guardar cambios'}
              </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
