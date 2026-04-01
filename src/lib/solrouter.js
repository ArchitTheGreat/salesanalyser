import { SolRouter } from '@solrouter/sdk';

const client = new SolRouter({
  apiKey: 'sk_solrouter_ZMfNUaqvKJoipsxuteSPX03JWZ7LO1P'
});

export async function encryptPayload(data, pubKey) {
  // Simulating the UI step of client-side encryption before transmission
  return new Promise((resolve) => setTimeout(() => resolve(data), 800));
}

export async function simulateAgentAnalysis(txData) {
  const prompt = `
You are a privacy-first, zero-knowledge business intelligence engine.
Produce a strict markdown analysis of the following Devnet solana transactions:

${JSON.stringify(txData)}

Calculate and provide ONLY a strict markdown response matching exactly this format:

# Sales & Intelligence Report

## Metrics
- Total Volume: [Estimate volume/activity]
- Unique Buyers: [Estimate unique entities interacting]
- Whale Share: [Estimate percentage from largest txs]%
- Repeat Buyer Rate: [Estimate percentage]%

## Observations
- [Bullet point insight 1]
- [Bullet point insight 2]
- [Bullet point insight 3]

## Actions
- [Bullet point recommendation 1]
- [Bullet point recommendation 2]
- [Bullet point recommendation 3]

NO charts. NO fluff. NO extra commentary.
`;

  try {
    const response = await client.chat(prompt, { 
      model: 'gpt-4o-mini'
    });
    return response.message;
  } catch (error) {
    console.error("SolRouter API Error:", error);
    throw new Error(error.message || 'Failed to process intelligence via SolRouter.');
  }
}

