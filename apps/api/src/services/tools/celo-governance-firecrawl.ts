/**
 * Celo governance scraper via Firecrawl. Source: https://mondo.celo.org/governance
 */

import Firecrawl from '@mendable/firecrawl-js';

const CELO_GOVERNANCE_URL = 'https://mondo.celo.org/governance';

let _firecrawl: Firecrawl | null = null;

function getFirecrawlClient(): Firecrawl {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY not set — Celo governance tool disabled');
    }
    _firecrawl = new Firecrawl({ apiKey });
  }
  return _firecrawl;
}

export interface CeloGovernanceData {
  markdown: string;
  url: string;
  scrapedAt: string;
}

/**
 * Scrape Celo governance page content via Firecrawl.
 */
export async function scrapeCeloGovernance(): Promise<CeloGovernanceData> {
  const client = getFirecrawlClient();
  const doc = await client.scrape(CELO_GOVERNANCE_URL, {
    formats: ['markdown'],
  });

  const markdown = (doc as { markdown?: string }).markdown ?? '';
  return {
    markdown: markdown.slice(0, 15000),
    url: CELO_GOVERNANCE_URL,
    scrapedAt: new Date().toISOString(),
  };
}
