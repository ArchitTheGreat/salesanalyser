import React, { useState } from 'react';
import { getRecentTransactions } from '../lib/solana';
import { encryptPayload, simulateAgentAnalysis } from '../lib/solrouter';
import ReactMarkdown from 'react-markdown';

export function Dashboard({ walletAddress, disconnect }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, PROCESSING, DONE
  const [report, setReport] = useState(null);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`]);
  };

  const runAnalysis = async () => {
    try {
      setLogs([]);
      setReport(null);
      setStatus('SCANNING');
      
      addLog('[SCANNING] Fetching transactions via @solana/web3.js...');
      const txs = await getRecentTransactions(walletAddress, 150);
      addLog(`[OK] ${txs.length} transactions found.`);
      
      setStatus('PROCESSING');
      addLog('[PROCESSING] Structuring dataset...');
      
      addLog('[SECURE] Encrypting payload with solrouter-sdk...');
      const encryptedData = await encryptPayload(txs, walletAddress);
      addLog('[SECURE] Payload encrypted. Dispatching to SolRouter Agent.');
      
      const markdownReport = await simulateAgentAnalysis(encryptedData);
      
      addLog('[OK] Processed insights received. Decrypting client-side...');
      setReport(markdownReport);
      
      setStatus('DONE');
      addLog('[DONE] Analysis complete.');
      
    } catch (err) {
      console.error(err);
      addLog(`[ERROR] ${err.message}`);
      setStatus('IDLE');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-secondary pb-4">
        <div>
          <h1 className="text-xl">SalesAnalyser_</h1>
          <p className="text-secondary text-sm">PRIVACY-FIRST COM-SEC</p>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-secondary">
            USER: <span className="text-primary truncate max-w-[150px] inline-block align-bottom">{walletAddress}</span>
          </span>
          <button className="terminal-btn text-xs py-1" onClick={disconnect}>
            DIsCONNECT
          </button>
        </div>
      </header>

      {/* ACTION PANEL */}
      <section className="terminal-box space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-secondary text-sm uppercase tracking-widest">Analytics Engine</h2>
          <button 
            className="terminal-btn"
            onClick={runAnalysis}
            disabled={status === 'SCANNING' || status === 'PROCESSING'}
          >
            {status !== 'IDLE' && status !== 'DONE' ? 'PROCESSING...' : 'INIT_ANALYSIS'}
          </button>
        </div>

        {/* TERMINAL OUTPUT */}
        <div className="bg-black border border-secondary p-4 mt-4 h-48 overflow-y-auto font-mono text-xs text-secondary leading-relaxed">
          {logs.length === 0 && <span className="opacity-50">Awaiting command...</span>}
          {logs.map((L, i) => (
            <div key={i} className="whitespace-pre-wrap">{L}</div>
          ))}
          {(status === 'SCANNING' || status === 'PROCESSING') && (
            <div className="animate-blink text-accent mt-2">_</div>
          )}
        </div>
      </section>

      {/* INSIGHTS RENDERER */}
      {report && status === 'DONE' && (
        <section className="terminal-box min-h-[300px]">
          <h2 className="text-secondary text-sm uppercase tracking-widest mb-6 border-b border-secondary pb-2">
            INTELLIGENCE REPORT
          </h2>
          <div className="prose prose-invert prose-p:text-sm prose-li:text-sm prose-h1:text-lg prose-h2:text-base max-w-none prose-h2:text-secondary prose-h1:font-bold">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}
