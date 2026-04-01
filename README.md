# SalesAnalyser

> Privacy-first, zero-knowledge business intelligence engine for on-chain merchants.

---

## What Is This

SalesAnalyser is a hardened, minimal analytics engine built for Solana wallet holders. It fetches your on-chain transaction history, encrypts the payload client-side using the SolRouter SDK, and dispatches it to an encrypted AI compute agent. Only the processed intelligence report is returned. Raw data never leaves your machine unencrypted.

This is not a dashboard. This is not a chatbot. This is a secure instrument.

---

## Core Philosophy

- **Zero-Knowledge Auth** — Phantom wallet signature. No email. No password. No database.
- **Local-First** — All data fetching and encryption happens in your browser.
- **Privacy by Default** — The SolRouter SDK uses X25519 key exchange (Arcium RescueCipher) before any payload leaves the client.
- **Minimal Surface Area** — No backend servers, no cloud DB, no telemetry.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Typography | JetBrains Mono (Google Fonts) |
| Blockchain | @solana/web3.js |
| Wallet Auth | Phantom (via `window.solana`) |
| Privacy / AI | @solrouter/sdk (Arcium TEE encryption) |

---

## Features

### 1. Zero-Knowledge Wallet Login
Connect your Phantom wallet. A one-time cryptographic `signMessage` request is issued. No credential is stored on any server. The signed session is cached in `localStorage` only.

### 2. Transaction Fetcher
Uses `@solana/web3.js` to pull up to 150 recent transaction signatures from your wallet. Extracts timestamps, memos, confirmation status, and error flags.

Terminal-style output during fetch:
```
[SCANNING] Fetching transactions via @solana/web3.js...
[OK] 150 transactions found.
[PROCESSING] Structuring dataset...
[SECURE] Encrypting payload with solrouter-sdk...
[SECURE] Payload encrypted. Dispatching to SolRouter Agent.
```

### 3. Encrypted AI Analysis
The structured transaction JSON is encrypted client-side by `@solrouter/sdk` using Arcium's X25519 RescueCipher before dispatch. The SolRouter agent processes the payload inside a Trusted Execution Environment (TEE). Only the final markdown intelligence report is returned.

### 4. Intelligence Report
The decrypted report is rendered as clean markdown directly in the terminal interface:

```markdown
# Sales & Intelligence Report

## Metrics
- Total Volume: X USDC
- Unique Buyers: X
- Whale Share: X%
- Repeat Buyer Rate: X%

## Observations
- ...

## Actions
- ...
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Phantom browser extension installed

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
/src
  /components
    Dashboard.jsx       # Post-auth UI: terminal log, analysis trigger, report renderer
  /hooks
    useWallet.js        # Zero-knowledge Phantom auth hook
  /lib
    solana.js           # @solana/web3.js connection + transaction fetcher
    solrouter.js        # @solrouter/sdk client, encryption, AI dispatch
  /styles
    index.css           # Tailwind v4 design system (monochrome terminal theme)
  App.jsx               # Root: login gate vs dashboard routing
  main.jsx              # React entrypoint
```

---

## Design System

| Token | Value |
|---|---|
| Background | `#000000` |
| Primary Text | `#FFFFFF` |
| Secondary Text | `#737373` |
| Accent | `#00FF41` |
| Font | JetBrains Mono |

No rounded corners. No shadows. No gradients. No charts. No animations except a single blinking cursor.

---

## Security Model

```
Browser (Client)
  └─ Phantom Wallet         ← Signature authentication, never exposes private key
  └─ @solana/web3.js        ← Fetches tx signatures from public Solana RPC
  └─ @solrouter/sdk         ← Encrypts payload locally (X25519 key exchange)
        │
        ▼ [Encrypted Payload Only]
SolRouter Agent (TEE)
  └─ Arcium RescueCipher    ← Secure enclave decryption
  └─ AI Model (gpt-4o-mini) ← Analysis synthesis
        │
        ▼ [Markdown Report Only]
Browser (Client)
  └─ react-markdown         ← Renders final intelligence output
```

Raw transaction data is never transmitted in plaintext. The AI backend never receives an unencrypted payload.

---

## License

MIT
