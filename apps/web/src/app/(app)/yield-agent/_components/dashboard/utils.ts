/* ------------------------------------------------------------------ */
/*  Protocol logo map (shared by Positions and Opportunities)        */
/* ------------------------------------------------------------------ */

export const PROTOCOL_LOGOS: Record<string, string> = {
  uniswap: '/protocols/uniswap.png',
  ichi: '/protocols/ichi.avif',
  steer: '/protocols/steer.webp',
  merkl: '/protocols/merkl.svg',
};

export function getProtocolLogo(protocol: string): string | undefined {
  if (!protocol) return undefined;
  const key = protocol.toLowerCase().trim();
  return PROTOCOL_LOGOS[key] ?? PROTOCOL_LOGOS[protocol];
}
