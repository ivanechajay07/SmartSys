import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  Loader2,
  Mail,
  Moon,
  HeartPulse,
  Route,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { api, apiErrorMessage, loginRequest, toSessionUser } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/store/auth';
import { Button, ErrorAlert, Field, Input, Modal } from '@/components/ui';
import '@/styles/login.css';
import '@/styles/preload.css';

const schema = z.object({
  email: z.string().min(1, 'Ingrese su correo').email('Ingrese un correo válido'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

type LoginForm = z.infer<typeof schema>;

const PRELOAD_STEPS = [
  { label: 'Credenciales', hint: 'Token y sesión segura', Icon: KeyRound },
  { label: 'Permisos', hint: 'Roles y accesos por módulo', Icon: ShieldCheck },
  { label: 'Módulos', hint: 'Sincronización operativa', Icon: Boxes },
  { label: 'Panel', hint: 'Preparación del panel general', Icon: Gauge },
];

const PRELOAD_STATUS = [
  'Validando credenciales y token seguro…',
  'Cargando permisos y roles del sistema…',
  'Sincronizando módulos operativos…',
  'Preparando tu panel general…',
];

export default function PaginaAcceso() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuth((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [preloadStep, setPreloadStep] = useState(0);
  const [preloadLeaving, setPreloadLeaving] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [recoverSent, setRecoverSent] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const shellRef = useRef<HTMLDivElement>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
  const expired = new URLSearchParams(location.search).get('expired') === '1';

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const auth = await loginRequest(values);
      setSession(auth.token, auth.refreshToken, toSessionUser(auth));
      setWelcomeName(auth.nombre);
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!welcomeName) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stepDelay = reduced ? 40 : 420;
    setPreloadStep(0);
    setPreloadLeaving(false);
    const interval = window.setInterval(() => {
      setPreloadStep((step) => Math.min(3, step + 1));
    }, stepDelay);
    const leaveTimer = window.setTimeout(() => setPreloadLeaving(true), reduced ? 200 : 1900);
    const navTimer = window.setTimeout(
      () => navigate(from, { replace: true }),
      reduced ? 250 : 2320,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(navTimer);
    };
  }, [welcomeName, from, navigate]);

  const skipPreload = () => {
    if (!welcomeName || preloadLeaving) return;
    setPreloadLeaving(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => navigate(from, { replace: true }), reduced ? 0 : 380);
  };

  const openRecovery = () => {
    setRecoverOpen(true);
    setRecoverEmail(getValues('email'));
    setRecoverError(null);
    setRecoverSent(false);
  };

  const submitRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoverBusy(true);
    setRecoverError(null);
    try {
      await api.post('/auth/forgot-password', { email: recoverEmail.trim() });
      setRecoverSent(true);
    } catch (error) {
      setRecoverError(apiErrorMessage(error));
    } finally {
      setRecoverBusy(false);
    }
  };

  const handleCapsLock = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState('CapsLock'));
  };

  const handleSpotlight = (event: ReactPointerEvent<HTMLDivElement>) => {
    const card = shellRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
  };

  const resetSpotlight = () => {
    shellRef.current?.style.setProperty('--pointer-x', '50%');
    shellRef.current?.style.setProperty('--pointer-y', '0%');
  };

  return (
    <div className="login-page" data-theme={theme} style={{ colorScheme: theme }}>
      <div className="login-bg" aria-hidden>
        <div className="login-mesh" />
        <div className="login-grid" />
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-noise" />
      </div>

      <div className="login-content">
        <header className="login-header">
          <div className="login-brand">
            <BrandMark />
            <div>
              <p className="login-brand-name">Higiene y Salud S.A.C.</p>
            </div>
          </div>

          <div className="login-header-actions">
            <button
              type="button"
              className="login-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              <span className="login-theme-thumb" aria-hidden />
              <Moon className="login-theme-moon" aria-hidden />
              <Sun className="login-theme-sun" aria-hidden />
            </button>
          </div>
        </header>

        <main className="login-main">
          <div
            ref={shellRef}
            onPointerMove={handleSpotlight}
            onPointerLeave={resetSpotlight}
            className="login-shell-card"
          >
            <aside className="login-story">
              <svg
                className="login-story-route"
                viewBox="0 0 760 170"
                fill="none"
                aria-hidden
              >
                <path
                  className="login-route-glow"
                  d="M-30 132 C 120 132, 140 44, 280 66 S 450 152, 565 96 S 680 26, 790 40"
                  stroke="#34d3ac"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  className="login-route-line"
                  d="M-30 132 C 120 132, 140 44, 280 66 S 450 152, 565 96 S 680 26, 790 40"
                  stroke="url(#login-route-gradient)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="login-route-gradient" x1="0" y1="0" x2="760" y2="0">
                    <stop stopColor="#34d3ac" stopOpacity="0" />
                    <stop offset="0.45" stopColor="#34d3ac" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="login-story-inner">
                <div className="login-story-brand login-reveal">
                  <span className="login-story-logo">
                    <HeartPulse className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="login-story-company">Higiene y Salud S.A.C.</p>
                    <p className="login-story-tagline">Soluciones integrales de higiene y salud</p>
                  </div>
                </div>

                <h1 className="login-display login-reveal login-reveal-1">
                  Cuidamos la higiene,
                  <span className="login-display-gradient">impulsamos su operación.</span>
                </h1>

                <p className="login-lede login-reveal login-reveal-2">
                  Plataforma corporativa para la gestión integral de suministros, logística y
                  servicios de higiene y salud.
                </p>

                <ul className="login-capabilities login-reveal login-reveal-3">
                  <li>
                    <span className="login-capability-icon">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <strong>Gestión segura</strong>
                    <span>Acceso y operaciones controladas</span>
                  </li>
                  <li>
                    <span className="login-capability-icon">
                      <Route className="h-4 w-4" />
                    </span>
                    <strong>Trazabilidad</strong>
                    <span>Seguimiento de cada proceso</span>
                  </li>
                  <li>
                    <span className="login-capability-icon">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <strong>Excelencia</strong>
                    <span>Servicio orientado al bienestar</span>
                  </li>
                </ul>

                <div className="login-story-note login-reveal login-reveal-4">
                  <HeartPulse className="h-4 w-4" />
                  <span>
                    Comprometidos con la salud y el bienestar de las instituciones del Perú.
                  </span>
                </div>
              </div>
            </aside>

            <section className="login-form-panel">
              <div className="login-form-inner">
                <div className="login-reveal login-reveal-2">
                  <p className="login-form-eyebrow">
                    <ShieldCheck className="h-3.5 w-3.5" /> Acceso corporativo
                  </p>
                  <h2 className="login-form-title">Iniciar sesión</h2>
                  <p className="login-form-sub">
                    Bienvenido de nuevo. Ingresa con tus credenciales para continuar.
                  </p>
                </div>

                {expired && (
                  <div className="login-alert login-alert-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Tu sesión expiró. Vuelve a iniciar sesión para continuar.</span>
                  </div>
                )}

                {serverError && (
                  <div role="alert" className="login-alert login-alert-error">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <form className="login-form login-reveal login-reveal-3" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-email">
                      Correo corporativo
                    </label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        inputMode="email"
                        className="login-input"
                        placeholder="usuario@smartsys.local"
                        aria-invalid={Boolean(errors.email)}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="login-field-error">{errors.email.message}</p>}
                  </div>

                  <div className="login-field" onBlur={() => setCapsLock(false)}>
                    <label className="login-label" htmlFor="login-password">
                      Contraseña
                    </label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="login-input login-input-password"
                        placeholder="••••••••••"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={capsLock ? 'caps-lock-warning' : undefined}
                        onKeyDown={handleCapsLock}
                        onKeyUp={handleCapsLock}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="login-password-toggle"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {capsLock && (
                      <p id="caps-lock-warning" className="login-caps" aria-live="polite">
                        <AlertTriangle className="h-3.5 w-3.5" /> Bloq Mayús está activado.
                      </p>
                    )}
                    {errors.password && <p className="login-field-error">{errors.password.message}</p>}
                    <button type="button" className="login-forgot" onClick={openRecovery}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <button type="submit" className="login-submit group" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Validando acceso...
                      </>
                    ) : (
                      <>
                        Ingresar al sistema
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="login-help">
                  ¿Problemas para acceder? Contacte al administrador del sistema.
                </p>
              </div>
            </section>
          </div>

          <div className="login-footer">
            <p>© 2026 Higiene y Salud S.A.C.</p>
            <a href="/actuator/health" target="_blank" rel="noreferrer">
              <Activity className="h-3 w-3" /> Estado del sistema
            </a>
          </div>
        </main>
      </div>

      {welcomeName && (
        <div
          className={`boot-preload${preloadLeaving ? ' is-leaving' : ''}`}
          role="status"
          aria-live="polite"
          onKeyDown={(event) => {
            if (event.key === 'Escape') skipPreload();
          }}
        >
          <div className="boot-preload-bg" aria-hidden>
            <span className="boot-preload-orb boot-preload-orb-1" />
            <span className="boot-preload-orb boot-preload-orb-2" />
            <span className="boot-preload-grid" />
          </div>

          <div className="boot-preload-shell">
            <aside className="boot-preload-aside">
              <div className="boot-preload-brand">
                <BrandMark />
                <div>
                  <p>Higiene y Salud S.A.C.</p>
                  <span>Soluciones integrales de higiene y salud</span>
                </div>
              </div>

              <div className="boot-preload-copy">
                <p className="boot-preload-kicker">
                  <Sparkles className="h-3 w-3" /> Sistema corporativo
                </p>
                <h1>Preparando tu espacio de trabajo</h1>
                <p className="boot-preload-lead">
                  Validamos tu acceso y sincronizamos los módulos habilitados para tu rol.
                </p>
              </div>

              <ul className="boot-preload-pillars">
                <li>
                  <span><ShieldCheck className="h-4 w-4" /></span>
                  <div>
                    <strong>Acceso seguro</strong>
                    <small>Sesión cifrada y permisos por rol</small>
                  </div>
                </li>
                <li>
                  <span><Boxes className="h-4 w-4" /></span>
                  <div>
                    <strong>Operación conectada</strong>
                    <small>Solicitudes, rutas e inventario</small>
                  </div>
                </li>
                <li>
                  <span><Activity className="h-4 w-4" /></span>
                  <div>
                    <strong>Trazabilidad</strong>
                    <small>Historial y auditoría en tiempo real</small>
                  </div>
                </li>
              </ul>

              <p className="boot-preload-foot">© 2026 Higiene y Salud S.A.C.</p>
            </aside>

            <section className="boot-preload-main">
              <div className="boot-preload-visual" aria-hidden>
                <span className="boot-preload-halo" />
                <span className="boot-preload-ring boot-preload-ring-1" />
                <span className="boot-preload-ring boot-preload-ring-2" />
                <span className="boot-preload-core">
                  <HeartPulse className="h-7 w-7" />
                </span>
              </div>

              <p className="boot-preload-badge">
                <ShieldCheck className="h-3.5 w-3.5" /> Acceso verificado
              </p>
              <h2 className="boot-preload-welcome">
                Bienvenido, <span>{welcomeName.split(' ')[0]}</span>
              </h2>
              <p className="boot-preload-status" key={preloadLeaving ? 'ready' : preloadStep}>
                {preloadLeaving ? 'Acceso listo. Abriendo tu panel…' : PRELOAD_STATUS[preloadStep]}
              </p>

              <div className="boot-preload-progress-row">
                <div
                  className="boot-preload-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={preloadLeaving ? 100 : (preloadStep + 1) * 25}
                >
                  <span style={{ width: `${preloadLeaving ? 100 : ((preloadStep + 1) / 4) * 100}%` }} />
                </div>
                <span className="boot-preload-percent">{preloadLeaving ? 100 : (preloadStep + 1) * 25}%</span>
              </div>

              <ul className="boot-preload-steps">
                {PRELOAD_STEPS.map(({ label, hint, Icon }, index) => {
                  const done = preloadLeaving || index < preloadStep;
                  const current = !preloadLeaving && index === preloadStep;
                  return (
                    <li
                      key={label}
                      className={`boot-preload-step${done ? ' is-done' : current ? ' is-current' : ''}`}
                      title={hint}
                    >
                      <span>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <div>
                        <strong>{label}</strong>
                        <small>{done ? 'Completado' : current ? 'En proceso…' : 'En espera'}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button type="button" className="boot-preload-skip" onClick={skipPreload}>
                Continuar ahora <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </div>
        </div>
      )}

      <Modal
        open={recoverOpen}
        title="Recuperar contraseña"
        subtitle="Solicita al administrador el restablecimiento de tu acceso."
        icon={<KeyRound className="h-4 w-4" />}
        onClose={() => setRecoverOpen(false)}
        size="sm"
        footer={
          recoverSent ? (
            <Button onClick={() => setRecoverOpen(false)}>Entendido</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setRecoverOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="recover-form"
                loading={recoverBusy}
                disabled={!recoverEmail.trim()}
              >
                Enviar solicitud
              </Button>
            </>
          )
        }
      >
        {recoverSent ? (
          <div className="login-recover-success">
            <span><CheckCircle2 className="h-6 w-6" /></span>
            <h3>Solicitud enviada</h3>
            <p>
              Si el correo está registrado, el administrador recibirá la solicitud y verificará
              tu identidad antes de restablecer la contraseña.
            </p>
          </div>
        ) : (
          <form id="recover-form" className="space-y-4" onSubmit={submitRecovery} noValidate>
            {recoverError && <ErrorAlert message={recoverError} />}
            <Field label="Correo corporativo" hint="Usa el correo con el que accedes al sistema.">
              <Input
                type="email"
                autoComplete="email"
                placeholder="usuario@smartsys.local"
                value={recoverEmail}
                onChange={(event) => setRecoverEmail(event.target.value)}
              />
            </Field>
            <p className="login-recover-note">
              Por seguridad, no mostramos si el correo existe. La solicitud se enviará al
              administrador para su validación.
            </p>
          </form>
        )}
      </Modal>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="login-brand-mark">
      <HeartPulse className="h-5 w-5" />
    </span>
  );
}
