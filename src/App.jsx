import React from 'react';
import { useWallet } from './hooks/useWallet';
import { Dashboard } from './components/Dashboard';

function App() {
  const { walletAddress, connect, disconnect, isConnecting, error } = useWallet();

  if (walletAddress) {
    return <Dashboard walletAddress={walletAddress} disconnect={disconnect} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="terminal-box max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl mb-2">SalesAnalyser_</h1>
          <p className="text-secondary text-sm">SECURE TERMINAL ACCESS</p>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-secondary leading-relaxed border-l-2 border-secondary pl-4 text-left">
            AUTHENTICATION PROTOCOL v1.0<br/>
            - Requires Solana Wallet (Phantom)<br/>
            - Zero-Knowledge Signature Verification<br/>
            - No session persistence beyond local storage
          </p>
          
          <button 
            className="terminal-btn w-full flex items-center justify-center gap-2"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="animate-blink">_</span> AUTHENTICATING...
              </>
            ) : (
              'CONNECT_WALLET'
            )}
          </button>
          
          {error && (
            <div className="text-red-500 text-xs text-left">
              [ERROR] {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
