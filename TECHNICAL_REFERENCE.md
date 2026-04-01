# SalesAnalyser — Full Technical Reference

**Version:** 1.0.0  
**Stack:** React + Vite + Tailwind CSS v4 + @solana/web3.js + @solrouter/sdk  
**Architecture:** Fully client-side. Zero backend. Zero database.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Authentication Model](#authentication-model)
4. [Transaction Fetching](#transaction-fetching)
5. [Encryption Layer](#encryption-layer)
6. [AI Analysis Engine](#ai-analysis-engine)
7. [Report Rendering](#report-rendering)
8. [Design System](#design-system)
9. [File-by-File Reference](#file-by-file-reference)
10. [Environment & Configuration](#environment--configuration)
11. [Known Limitations & Constraints](#known-limitations--constraints)
12. [Extending the System](#extending-the-system)

---

## 1. System Overview

SalesAnalyser processes on-chain Solana transaction history through a privacy-preserving pipeline. The key constraint driving every design decision:

> **Raw financial data must never leave the client in plaintext.**

The system achieves this by encrypting the transaction payload locally using the `@solrouter/sdk` before dispatching it to the SolRouter agent. The agent operates inside a Trusted Execution Environment (TEE). Only the synthesized intelligence report — a structured markdown document — is returned to the frontend.

There is no user account. No server-side session. No analytics. No third-party trackers. The only network calls made are:
- Solana RPC (public endpoint, read-only)
- SolRouter API (encrypted payload only)
- Google Fonts (JetBrains Mono, static asset)

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                    │
│                                                            │
│  ┌─────────────┐    ┌──────────────────────────────────┐  │
│  │   Phantom   │    │          React App (Vite)         │  │
│  │   Wallet    │◄──►│                                  │  │
│  │  (window.   │    │  App.jsx                         │  │
│  │   solana)   │    │   └─ useWallet.js (ZK auth)      │  │
│  └─────────────┘    │   └─ Dashboard.jsx               │  │
│                     │       ├─ solana.js (fetch)        │  │
│                     │       └─ solrouter.js (encrypt)   │  │
│                     └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
         │ RPC Call (signatures only)    │ Encrypted POST
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────────────┐
│  Solana Network │          │     SolRouter API (TEE)      │
│  (Devnet RPC)   │          │  ┌───────────────────────┐  │
│  Public read    │          │  │  Arcium RescueCipher   │  │
│  endpoint       │          │  │  X25519 key exchange   │  │
└─────────────────┘          │  └───────────────────────┘  │
                             │  ┌───────────────────────┐  │
                             │  │  AI Model (gpt-4o-mini)│  │
                             │  │  (synthesis only)      │  │
                             │  └───────────────────────┘  │
                             └─────────────────────────────┘
                                           │
                                  Markdown Report (plaintext)
                                           │
                                           ▼
                                    react-markdown
                                    (client render)
```

---

## 3. Authentication Model

**File:** `src/hooks/useWallet.js`

### Flow

```
1. User clicks CONNECT_WALLET
2. window.solana.connect() is called
   └─ Returns: { publicKey: PublicKey }
3. A one-time nonce message is constructed:
   "Sign this message to authenticate with SalesAnalyser.\n\nNonce: <timestamp>"
4. window.solana.signMessage(encodedMessage, 'utf8') is called
   └─ User approves in Phantom popup
5. On approval: walletAddress stored in localStorage key 'sa_session'
6. On rejection or error: session cleared, error surfaced to UI
```

### Why signMessage (not just connect)?

`window.solana.connect()` only proves the user has a wallet. `signMessage` proves the user *controls the private key* at that moment, without exposing the key itself. This is the minimum viable proof-of-identity on Solana without smart contract interaction.

### Session

- Stored in `localStorage` as the raw Base58 public key string under the key `sa_session`.
- Cleared on disconnect or error.
- Re-hydrated on page load via `useEffect`.
- No JWT. No token. No refresh mechanism.

### Disconnect

Calls `window.solana.disconnect()`, clears `localStorage`, and resets component state. The wallet popup is not shown.

---

## 4. Transaction Fetching

**File:** `src/lib/solana.js`

### RPC Connection

```javascript
const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');
```

**Why Devnet?**  
The Solana public Mainnet-Beta RPC (`api.mainnet-beta.solana.com`) returns `403 Forbidden` for browser-origin requests against historical transaction indexes. This is their IP-based rate limiting and CORS policy enforcing paid RPC tiers for historical lookups. The Devnet endpoint accepts these requests without restriction.

**To use Mainnet:** Subscribe to a dedicated RPC provider (e.g., Helius, QuickNode, Alchemy for Solana). Replace `RPC_URL` with your provider's endpoint.

### Signature Fetching

```javascript
const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 150 });
```

`getSignaturesForAddress` returns an array of `ConfirmedSignatureInfo` objects. Each contains:
- `signature` — Base58 transaction hash
- `blockTime` — UNIX timestamp (nullable)
- `confirmationStatus` — `'processed' | 'confirmed' | 'finalized'`
- `err` — Error object if transaction failed, or `null`
- `memo` — Attached memo string if any, or `null`

### Data Structure

Each transaction is mapped to a flat, minimal object for AI consumption:

```javascript
{
  signature: "4kXXv...",
  timestamp: "2026-04-01T06:44:56.000Z",
  status: "finalized",
  err: null,
  memo: null,
  address: "AbCdE..."
}
```

**Why not fetch full parsed transactions?**  
Full transaction parsing via `getParsedTransaction()` requires one RPC call per transaction. Fetching 150 full transactions would make 150 sequential or parallel RPC requests, triggering rate limits within seconds. Signature metadata is sufficient for the AI intelligence synthesis.

---

## 5. Encryption Layer

**File:** `src/lib/solrouter.js`

### SDK Initialization

```javascript
import { SolRouter } from '@solrouter/sdk';

const client = new SolRouter({
  apiKey: 'sk_solrouter_...'
});
```

The SolRouter SDK handles all encryption internally. At the point of calling `client.chat()`, the SDK performs:
1. **X25519 key exchange** — Derives a shared secret with the SolRouter TEE's public key
2. **Arcium RescueCipher** — Encrypts the prompt payload using the derived key
3. **Dispatch** — Sends the opaque encrypted blob to `https://api.solrouter.com`

From the client's perspective, the API call is:

```javascript
const response = await client.chat(prompt, { model: 'gpt-4o-mini' });
```

From the wire's perspective, only an encrypted binary payload is transmitted. The SolRouter backend cannot read the content of the prompt without the client's ephemeral private key material.

### UI Encryption Step

The `encryptPayload()` function in `solrouter.js` is a deliberate UI affordance — it introduces an 800ms delay and logs `[SECURE] Encrypting payload...` to the terminal. This surfaces the encryption step visually before the SDK's internal encryption occurs as part of `client.chat()`.

---

## 6. AI Analysis Engine

**File:** `src/lib/solrouter.js` → `simulateAgentAnalysis()`

### Prompt Design

The prompt is structured to enforce strict output formatting:

```
You are a privacy-first, zero-knowledge business intelligence engine.
Produce a strict markdown analysis of the following Devnet solana transactions:

[TRANSACTION JSON ARRAY]

Calculate and provide ONLY a strict markdown response matching exactly this format:

# Sales & Intelligence Report
## Metrics
...
## Observations
...
## Actions
...

NO charts. NO fluff. NO extra commentary.
```

**Key design decisions:**
- The entire transaction array is serialized to JSON and embedded directly in the prompt. This ensures the AI has full data access without needing tool calls.
- `useTools: false` (default) — Tool calls to external APIs like `private_wallet_audit` were found to cause TEE processing failures when the target wallet has Devnet-only history, as the tools query Mainnet indexers. This will work correctly when switched to Mainnet.
- The prompt explicitly forbids charts, fluff, and extra commentary to enforce the minimal terminal aesthetic.

### Model

`gpt-4o-mini` via SolRouter's encrypted relay. Sufficient for structured data synthesis at low latency.

### Response

`response.message` — a markdown string, rendered directly into the UI.

---

## 7. Report Rendering

**File:** `src/components/Dashboard.jsx`

The markdown report is rendered using `react-markdown` with Tailwind CSS typography plugin (`@tailwindcss/typography`):

```jsx
<div className="prose prose-invert prose-p:text-sm prose-li:text-sm ...">
  <ReactMarkdown>{report}</ReactMarkdown>
</div>
```

`prose-invert` applies white text on dark background. All heading, paragraph, and list styles are controlled by the typography plugin with custom overrides keeping the monochrome terminal aesthetic intact.

---

## 8. Design System

**File:** `src/styles/index.css`

Built on **Tailwind CSS v4** using the new `@theme` block for custom design tokens:

```css
@theme {
  --color-background: #000000;
  --color-primary:    #FFFFFF;
  --color-secondary:  #737373;
  --color-accent:     #00FF41;
  --font-mono: "JetBrains Mono", monospace;
}
```

### Component Classes

| Class | Description |
|---|---|
| `.terminal-box` | 1px solid `#737373` border, black background, 1rem padding |
| `.terminal-btn` | Bordered button, uppercase, letter-spaced. Hover: accent border + text |
| `.terminal-input` | Black background input. Focus: accent border |
| `.animate-blink` | Step-end blink animation, 1s cycle — used on the `_` cursor only |

### Rules
- No `border-radius` anywhere
- No `box-shadow` anywhere
- No CSS gradients
- No color except accent, and only used on hover states and the blinking cursor
- JetBrains Mono applied globally via `body` rule

---

## 9. File-by-File Reference

### `src/main.jsx`
React 18 entrypoint. Mounts `<App />` to `#root`. Imports the global CSS.

### `src/App.jsx`
Root component. Holds the wallet gate:
```
if (walletAddress) → render <Dashboard />
else               → render login screen
```

### `src/hooks/useWallet.js`
- `walletAddress` — current authenticated public key or `null`
- `connect()` — triggers Phantom connect + signMessage flow
- `disconnect()` — clears session and Phantom connection
- `isConnecting` — boolean for loading state
- `error` — error message string or `null`

### `src/lib/solana.js`
- `getConnection()` — returns a `Connection` instance to Devnet
- `getRecentTransactions(walletAddress, limit)` — fetches and maps transaction signatures

### `src/lib/solrouter.js`
- `encryptPayload(data, pubKey)` — UI affordance, 800ms delay
- `simulateAgentAnalysis(txData)` — builds prompt, calls `client.chat()`, returns markdown

### `src/components/Dashboard.jsx`
- Renders the post-auth interface
- Manages `logs`, `status`, `report` state
- `runAnalysis()` — orchestrates the full fetch → encrypt → analyze → render pipeline

### `tailwind.config.js`
Minimal config pointing Tailwind at `/src/**`. Includes `@tailwindcss/typography` plugin.

### `vite.config.js`
Includes `vite-plugin-node-polyfills` to shim `Buffer`, `global`, and `process` — required by `@solana/web3.js` which is designed for Node.js but runs here in the browser.

### `postcss.config.js`
Uses `@tailwindcss/postcss` (Tailwind v4 PostCSS adapter).

---

## 10. Environment & Configuration

No `.env` file is required. The API key is hardcoded in `src/lib/solrouter.js`.

To switch to Mainnet, change one line in `src/lib/solana.js`:

```javascript
// Current (Devnet)
const RPC_URL = 'https://api.devnet.solana.com';

// For Mainnet with a private RPC (Helius, QuickNode, etc.)
const RPC_URL = 'https://rpc.helius.xyz/?api-key=YOUR_HELIUS_KEY';
```

When on Mainnet, `useTools: true` can be re-enabled in `simulateAgentAnalysis()` to activate the SolRouter agent's `private_wallet_audit`, `token_price`, and `web_search` capabilities.

---

## 11. Known Limitations & Constraints

| Issue | Cause | Resolution |
|---|---|---|
| `403 Forbidden` on tx fetch | Mainnet public RPC blocks browser-origin historical queries | Use Devnet or a paid Mainnet RPC |
| `TEE processing failed` | `useTools: true` with Devnet wallets — tools hit Mainnet indexers that don't know about Devnet addresses | Use Mainnet wallet data, or keep `useTools: false` |
| Only 4 devnet transactions | Devnet wallets typically have sparse history | Use a Mainnet wallet with real transaction history |
| API key exposed in client bundle | Hardcoded per specification | For production: proxy via a lightweight serverless function |
| Large prompt for high tx counts | JSON-serialized 150 txs can hit token limits | Reduce `limit` param or summarize before sending |

---

## 12. Extending the System

### Switch to Mainnet + Full Tool Mode

```javascript
// src/lib/solana.js
const RPC_URL = 'https://rpc.helius.xyz/?api-key=...';

// src/lib/solrouter.js
const response = await client.chat(prompt, {
  model: 'gpt-4o-mini',
  useTools: true   // private_wallet_audit, token_price, web_search
});
```

### Add More Models

SolRouter supports GPT-5, Claude 4.5 Sonnet, Claude 3.5 Haiku, and Nosana decentralized inference. Swap the model string:

```javascript
{ model: 'claude-3-5-haiku' }
{ model: 'gpt-5' }
{ model: 'claude-4-5-sonnet' }
```

### Add Report History

```javascript
// After receiving a report, save to localStorage
const history = JSON.parse(localStorage.getItem('sa_reports') || '[]');
history.unshift({ timestamp: Date.now(), report: markdownReport });
localStorage.setItem('sa_reports', JSON.stringify(history.slice(0, 10)));
```

### Export Report as Markdown File

```javascript
const blob = new Blob([report], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `salesanalyser-${Date.now()}.md`;
a.click();
```
