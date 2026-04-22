import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { registerWithEmail, loginWithGoogle } from '@/services/auth.service';
import GlowButton from '@/components/ui/GlowButton';
import { AuthLayout } from './Login';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      toast.success('Conta criada. Vista-se com o Rei.');
      navigate('/');
    } catch (err) {
      const msg = (err as { code?: string })?.code ?? '';
      if (msg.includes('email-already-in-use')) {
        toast.error('Este e-mail já está cadastrado');
      } else if (msg.includes('invalid-email')) {
        toast.error('E-mail inválido');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const registerGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Conta criada. Bem-vindo, Filho do Rei.');
      navigate('/');
    } catch {
      toast.error('Erro ao cadastrar com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="CADASTRAR" subtitle="Junte-se à realeza KING">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="relative flex items-center gap-3">
          <HiOutlineUser className="text-king-silver/70" />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            className="input-king"
          />
        </div>
        <div className="relative flex items-center gap-3">
          <HiOutlineMail className="text-king-silver/70" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="input-king"
          />
        </div>
        <div className="relative flex items-center gap-3">
          <HiOutlineLockClosed className="text-king-silver/70" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mínimo 6 caracteres)"
            className="input-king"
          />
        </div>

        <GlowButton fullWidth disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar conta real'}
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
        onClick={registerGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 border border-white/15 bg-white/5 py-4 font-mono text-[11px] uppercase tracking-[0.25em] text-king-fg transition hover:border-king-red hover:bg-white/10"
      >
        <FcGoogle className="text-xl" />
        Cadastrar com Google
      </button>

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-king-silver">
        Já tem conta?{' '}
        <Link to="/login" className="text-king-red hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
