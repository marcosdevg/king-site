import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Captura erros de render das rotas pra evitar tela em branco.
 * Chaveado por pathname no parent via `key` prop pra resetar ao navegar.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-king-black px-6 py-20 text-center">
          <h2 className="heading-display text-3xl text-king-fg md:text-4xl">
            Algo quebrou o reino
          </h2>
          <p className="max-w-md font-serif italic text-king-silver/80">
            Tivemos um problema ao renderizar essa página. Recarregue pra continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="border border-king-red bg-king-red px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-king-bone hover:bg-king-glow"
          >
            Recarregar página
          </button>
          <pre className="max-w-lg overflow-auto rounded border border-white/10 bg-king-jet/60 p-4 font-mono text-[10px] text-king-silver/70">
            {this.state.error.message}
          </pre>
        </main>
      );
    }
    return this.props.children;
  }
}
