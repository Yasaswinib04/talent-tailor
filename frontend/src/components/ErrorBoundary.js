import React from "react";
import { AlertTriangle } from "lucide-react";

/** Last line of defence: a render crash should not leave a blank page. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center" data-testid="error-boundary">
          <AlertTriangle size={24} className="text-danger mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold mb-2">Something broke on this screen.</h1>
          <p className="text-white/50 text-sm mb-6">
            The error has been logged to the console. Reloading usually clears it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand text-white px-5 py-2.5 text-sm hover:bg-brand/90 transition-colors linear-glow"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
