/**
 * ErrorBoundary — catches unhandled errors in the React tree.
 * Broadcast Premium fallback UI with retry / home buttons.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, Flag } from "lucide-react";
import { captureError } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    captureError(error, { componentStack: errorInfo.componentStack ?? undefined });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onHome={this.handleGoHome}
        />
      );
    }
    return this.props.children;
  }
}

/* ── Default fallback UI ───────────────────────────────── */

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onHome: () => void;
}

function ErrorFallback({ error, onRetry, onHome }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-pk-carbon flex flex-col">
      {/* Red Flag Banner */}
      <div className="w-full py-2 bg-pk-red text-white font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2">
        <Flag className="w-3 h-3" fill="currentColor" />
        Drapeau rouge — erreur système
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-pk-red/[0.12] border border-pk-red/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-pk-red" />
          </div>

          {/* Title */}
          <h1 className="font-display text-xl mb-2">Incident en piste</h1>
          <p className="text-sm text-pk-titane leading-relaxed mb-6 max-w-[280px] mx-auto">
            Une erreur inattendue s'est produite. Tes pronos sont en sécurité.
          </p>

          {/* Radio message */}
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3.5 mb-6 text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-live-pulse" />
              <span className="font-data text-[0.5rem] text-pk-red uppercase">Radio équipe</span>
            </div>
            <p className="text-[0.8125rem] italic text-pk-piste leading-snug">
              "On a un souci technique. Rentre aux stands et réessaye."
            </p>
          </div>

          {/* Error details (dev only) */}
          {import.meta.env.DEV && error && (
            <div className="bg-pk-red/[0.05] border border-pk-red/[0.15] rounded-lg p-3 mb-4 text-left">
              <p className="font-data text-[0.5625rem] text-pk-red break-all">{error.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onRetry}
              className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
              Relancer
            </button>
            <button
              onClick={onHome}
              className="w-full h-11 rounded-lg bg-white/[0.04] border border-white/[0.08] text-pk-piste text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Home className="w-4 h-4" />
              Retour au paddock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
