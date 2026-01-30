import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center font-mono">
                    <div className="max-w-2xl w-full space-y-8 bg-black/40 border border-red-500/20 p-12 rounded-[2rem] shadow-[0_0_50px_-10px_rgba(220,38,38,0.2)]">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </div>

                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-red-500 mb-2">System Malfunction</h1>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Vault Integrity Compromised</p>
                            </div>

                            <div className="w-full bg-red-900/10 p-6 rounded-xl border border-red-500/10 text-left overflow-auto max-h-48">
                                <p className="text-xs text-red-400 font-bold mb-2">ERROR_TRACE_LOG:</p>
                                <code className="text-[10px] text-red-300/70 whitespace-pre-wrap word-break-break-all">
                                    {this.state.error?.message || "Unknown system failure"}
                                </code>
                            </div>

                            <button
                                onClick={this.handleReset}
                                className="px-8 py-4 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 hover:border-red-500 rounded-xl transition-all duration-300 text-xs font-black uppercase tracking-widest"
                            >
                                Reboot System
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
