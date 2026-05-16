/**
 * ErrorBoundary — catches unhandled errors in the React tree.
 *
 * Displays an arcade-themed fallback UI with a retry button.
 * Prevents white-screen-of-death in production.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional fallback to render instead of the default UI */
  fallback?: ReactNode;
  /** Called when an error is caught — useful for logging/reporting */
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
      if (this.props.fallback) {
        return this.props.fallback;
      }

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

// ─── Default fallback UI ─────────────────────────────────────────────────────

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onHome: () => void;
}

function ErrorFallback({ error, onRetry, onHome }: ErrorFallbackProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Oups, quelque chose a plante !</h1>
          <p className="text-sm text-gray-400">
            Une erreur inattendue s&apos;est produite. Pas de panique, vos pronostics sont en
            securite.
          </p>
        </div>

        {/* Error details (dev only) */}
        {import.meta.env.DEV && error && (
          <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4 text-left">
            <p className="text-xs font-mono text-red-300 break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <RotateCcw className="w-4 h-4" />
            Reessayer
          </Button>
          <Button onClick={onHome} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
