import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Bell,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { api, apiErrorMessage, logoutRequest } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { fileToAvatar } from '@/lib/avatar';
import { formatDateTime } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { ROLE_LABELS, useAuth } from '@/store/auth';
import type { PerfilUsuario } from '@/types';
import { Button, Card, ErrorAlert, Field, Input } from '@/components/ui';
import { ModuleHero, ModuleKpi } from '@/components/module';
import { UserAvatar } from '@/components/UserAvatar';
import '@/styles/modules.css';

export default function PaginaPerfil() {
  const user = useAuth((state) => state.user);
  const updateUser = useAuth((state) => state.updateUser);
  const refreshToken = useAuth((state) => state.refreshToken);
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const perfil = useApiQuery<PerfilUsuario>(() => api.get('/auth/me').then((r) => r.data));

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!perfil.data) return;
    setNombres(perfil.data.nombres ?? '');
    setApellidos(perfil.data.apellidos ?? '');
    setTelefono(perfil.data.telefono ?? '');
    setAvatarUrl(perfil.data.avatarUrl ?? null);
    updateUser({
      nombre: perfil.data.nombre,
      telefono: perfil.data.telefono,
      avatarUrl: perfil.data.avatarUrl,
    });
  }, [perfil.data, updateUser]);

  const notifyProfile = (message: string) => {
    toastSuccess(message);
    setProfileError(null);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    if (!nombres.trim() || !apellidos.trim()) {
      setProfileError('Nombres y apellidos son obligatorios.');
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await api.put<PerfilUsuario>('/auth/profile', {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || null,
        avatarUrl,
      });
      updateUser({ nombre: data.nombre, telefono: data.telefono, avatarUrl: data.avatarUrl });
      perfil.reload();
      notifyProfile('Datos personales actualizados.');
    } catch (err) {
      setProfileError(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setProfileError(null);
    setUploading(true);
    try {
      const dataUrl = await fileToAvatar(file);
      setAvatarUrl(dataUrl);
      const { data } = await api.put<PerfilUsuario>('/auth/avatar', { avatarUrl: dataUrl });
      updateUser({ avatarUrl: data.avatarUrl });
      perfil.reload();
      notifyProfile('Foto de perfil actualizada.');
    } catch (err) {
      setProfileError(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    setProfileError(null);
    try {
      const { data } = await api.put<PerfilUsuario>('/auth/avatar', { avatarUrl: null });
      setAvatarUrl(data.avatarUrl ?? null);
      updateUser({ avatarUrl: data.avatarUrl });
      perfil.reload();
      notifyProfile('Foto de perfil eliminada.');
    } catch (err) {
      setProfileError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 10) {
      setPasswordError('La nueva contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toastSuccess('Contraseña actualizada. Las demás sesiones fueron revocadas.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(apiErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logoutRequest(refreshToken);
    logout();
    navigate('/login', { replace: true });
  };

  const strength = newPassword.length === 0 ? 0 : newPassword.length >= 14 ? 3 : newPassword.length >= 10 ? 2 : 1;
  const strengthLabel = ['Sin contraseña', 'Débil', 'Aceptable', 'Fuerte'][strength];
  const nombreCompleto = `${nombres} ${apellidos}`.trim() || user?.nombre || 'Usuario';

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Cuenta y seguridad"
        title="Mi perfil"
        description="Administra tus datos, tu foto y tu contraseña. Los cambios se reflejan en todo el sistema: sidebar, barra superior y módulos operativos."
        actions={
          <>
            <Link to="/notificaciones" className="mod-hero-button-soft">
              <Bell className="h-3.5 w-3.5" /> Notificaciones
            </Link>
            <button type="button" onClick={handleLogout} className="mod-hero-button">
              <Lock className="h-3.5 w-3.5" /> Cerrar sesión
            </button>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleKpi
          label="Rol asignado"
          value={user ? ROLE_LABELS[user.rol] : '-'}
          hint="Permisos vigentes"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="brand"
          delay="mod-reveal-1"
          compact
        />
        <ModuleKpi
          label="Último acceso"
          value={formatDateTime(perfil.data?.ultimoAcceso)}
          hint="Registro de auditoría"
          icon={<KeyRound className="h-5 w-5" />}
          tone="sky"
          delay="mod-reveal-2"
          compact
        />
        <ModuleKpi
          label="Cuenta"
          value="Activa"
          hint="Sesión JWT con refresh rotativo"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-3"
          compact
        />
        <ModuleKpi
          label="Miembro desde"
          value={formatDateTime(perfil.data?.createdAt)}
          hint="Alta en SmartSys"
          icon={<Sparkles className="h-5 w-5" />}
          tone="amber"
          delay="mod-reveal-4"
          compact
        />
      </div>

      {profileError && <ErrorAlert message={profileError} />}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="mod-reveal mod-reveal-2">
          <div className="mod-toolbar">
            <div className="mod-toolbar-top">
              <div>
                <h3 className="text-base font-bold text-slate-800">Datos personales</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  El correo de acceso es inmutable. Tu foto se muestra en el menú y en los módulos.
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                {user ? ROLE_LABELS[user.rol] : ''}
              </span>
            </div>
          </div>

          <form className="card-body space-y-5" onSubmit={saveProfile} noValidate>
            <div className="avatar-uploader">
              <UserAvatar name={nombreCompleto} src={avatarUrl ?? user?.avatarUrl} size={78} />
              <div className="avatar-uploader-copy">
                <p className="avatar-uploader-title">Foto de perfil</p>
                <p className="avatar-uploader-hint">
                  PNG, JPG o WEBP. Se recorta al centro y se reduce automáticamente a 256 × 256 px.
                </p>
                <div className="avatar-uploader-actions">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  />
                  <Button type="button" variant="soft" size="sm" loading={uploading} onClick={() => fileInput.current?.click()}>
                    <Camera className="h-3.5 w-3.5" /> Cambiar foto
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={removeAvatar}>
                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombres">
                <Input value={nombres} onChange={(event) => setNombres(event.target.value)} autoComplete="given-name" />
              </Field>
              <Field label="Apellidos">
                <Input value={apellidos} onChange={(event) => setApellidos(event.target.value)} autoComplete="family-name" />
              </Field>
              <Field label="Correo de acceso" hint="Gestionado por el administrador">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" value={perfil.data?.email ?? user?.email ?? ''} disabled />
                </div>
              </Field>
              <Field label="Teléfono">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400">
                Los cambios de nombre se reflejan en la auditoría de nuevas operaciones.
              </p>
              <Button type="submit" loading={savingProfile}>
                <CheckCircle2 className="h-4 w-4" /> Guardar cambios
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="mod-reveal mod-reveal-3">
            <div className="mod-toolbar">
              <div>
                <h3 className="text-base font-bold text-slate-800">Seguridad de la cuenta</h3>
                <p className="mt-0.5 text-xs text-slate-500">Actualiza tu contraseña periódicamente.</p>
              </div>
              <span className="mod-kpi-icon !h-9 !w-9">
                <KeyRound className="h-4 w-4" />
              </span>
            </div>

            <form className="card-body space-y-3" onSubmit={changePassword} noValidate>
              {passwordError && <ErrorAlert message={passwordError} />}

              <Field label="Contraseña actual">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </Field>
              <Field label="Nueva contraseña">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Field>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span>Fortaleza</span>
                  <span className={clsx(strength === 3 && 'text-emerald-600', strength === 2 && 'text-amber-600')}>
                    {strengthLabel}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={clsx(
                        'h-1.5 rounded-full',
                        strength >= level
                          ? level === 3
                            ? 'bg-emerald-500'
                            : level === 2
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          : 'bg-slate-200',
                      )}
                    />
                  ))}
                </div>
              </div>

              <Field label="Confirmar contraseña">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>

              <Button type="submit" loading={changingPassword} disabled={!currentPassword || !newPassword} className="w-full">
                <KeyRound className="h-4 w-4" /> Actualizar contraseña
              </Button>
            </form>
          </Card>

          <Card className="mod-reveal mod-reveal-4">
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">Preferencias</p>
                  <p className="text-[11px] text-slate-500">Tema visual y accesos rápidos.</p>
                </div>
                <button type="button" onClick={toggleTheme} className="btn btn-secondary btn-sm">
                  {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-semibold text-slate-700">
                  <UserRound className="h-3.5 w-3.5 text-brand-600" /> {nombreCompleto}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{perfil.data?.email ?? user?.email}</p>
              </div>
              <Link to="/notificaciones" className="btn btn-soft btn-sm w-full">
                <Bell className="h-3.5 w-3.5" /> Ver mis notificaciones
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
