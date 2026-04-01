import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';


export function useWallet() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check for stored session
  useEffect(() => {
    const sessionPubKey = localStorage.getItem('sa_session');
    if (sessionPubKey) {
      setWalletAddress(sessionPubKey);
    }
  }, []);

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if phantom is installed
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom wallet not found. Please install the Phantom extension.');
      }

      // Connect
      const resp = await window.solana.connect();
      const pubKeyText = resp.publicKey.toString();

      // Request Cryptographic Signature
      const message = `Sign this message to authenticate with SalesAnalyser.\n\nNonce: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      await window.solana.signMessage(encodedMessage, 'utf8');

      // Validated.
      setWalletAddress(pubKeyText);
      localStorage.setItem('sa_session', pubKeyText);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Signature rejected or extension missing.');
      disconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (window.solana) {
      window.solana.disconnect().catch(() => {});
    }
    setWalletAddress(null);
    localStorage.removeItem('sa_session');
  };

  return { walletAddress, connect, disconnect, isConnecting, error };
}
