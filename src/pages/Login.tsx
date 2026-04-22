import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { loginWithEmail, loginWithGoogle } from '@/services/auth.service';
import GlowButton from '@/components/ui/GlowButton';
import KingLogo from '@/components/ui/KingLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Bem-vindo, Filho do Rei.');
      navigate(from);
    } catch (err) {
      const msg = (err as { code?: string })?.code ?? '';
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        toast.error('E-mail ou senha inválidos');
      } else if (msg.includes('too-many-requests')) {
        toast.error('Muitas tentativas. Tente novamente depois.');
      } else {
        toast.error('Não foi possível entrar. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Bem-vindo, Filho do Rei.');
      navigate(from);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao entrar com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="ENTRAR" subtitle="Bem-vindo de volta à realeza">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <FieldIcon icon={<HiOutlineMail />}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="input-king"
          />
        </FieldIcon>
        <FieldIcon icon={<HiOutlineLockClosed />}>
          <input
            type={showPwd ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="input-king pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-0 top-3 text-king-silver hover:text-king-red"
          >
            {showPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
          </button>
        </FieldIcon>

        <GlowButton fullWidth disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </GlowButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/60">
          ou
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        onClick={loginGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 border border-white/15 bg-white/5 py-4 font-mono text-[11px] uppercase tracking-[0.25em] text-king-fg transition hover:border-king-red hover:bg-white/10"
      >
        <FcGoogle className="text-xl" />
        Continuar com Google
      </button>

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-king-silver">
        Novo no reino?{' '}
        <Link to="/cadastro" className="text-king-red hover:underline">
          Crie sua conta
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-king-black px-4 py-16">
      <div className="light-rays" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative w-full max-w-md overflow-hidden p-8 md:p-10"
      >
        <div className="absolute -top-px left-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-king-red/45 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-king-red/10 blur-3xl" />

        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <KingLogo variant="auto" className="h-12 w-auto sm:h-14" />
          </div>
          <h1 className="heading-display text-3xl text-king-fg">{title}</h1>
          <p className="mt-2 font-serif italic text-sm text-king-silver/70">
            {subtitle}
          </p>
        </div>

        {children}
      </motion.div>
    </main>
  );
}

function FieldIcon({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-3">
      <span className="text-king-silver/70">{icon}</span>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}
