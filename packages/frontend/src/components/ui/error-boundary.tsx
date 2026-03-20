import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
};

type State = { error: Error | null };

/**
 * Catches unhandled React render errors so they don't white-screen the entire
 * app. Pass a custom `fallback` to control what's shown; the default renders a
 * minimal recovery prompt.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(error, this.reset);
      }
      if (fallback !== undefined) {
        return fallback;
      }
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 12,
            padding: 24,
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--error)" }}>Something went wrong</p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              maxWidth: 480,
              wordBreak: "break-word",
              textAlign: "center",
            }}
          >
            {error.message}
          </p>
          <button
            onClick={this.reset}
            type="button"
            style={{
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-glass)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
