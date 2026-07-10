const CONFIG = require('../config');

const DUMPSTR_COLLECTION = '3RxiT9p6PiNffpxCKWXzpb5pNU9g6ycjeR8NxUkaJaBb';

const TIERS = ['legendary', 'diamond', 'gold', 'silver'];

const TIER_META = {
  silver:    { label: 'Silver Bag',    image: 'https://api.dumpstr.party/images/silver.png' },
  gold:      { label: 'Gold Bag',      image: 'https://api.dumpstr.party/images/gold.png' },
  diamond:   { label: 'Diamond Bag',   image: 'https://api.dumpstr.party/images/diamond.png' },
  legendary: { label: 'The Dumpster',  image: 'https://api.dumpstr.party/images/legendary.png' },
};

// Fallback if an asset's on-chain plugin data is missing the capacity field.
const CAPACITY_BY_TIER = { silver: 100000, gold: 500000, diamond: 2500000, legendary: 10000000 };

function heliusRpcUrl() {
  const key = process.env.HELIUS_KEY || '1dd352a7-004d-4efd-9e3e-438697c30f91';
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

async function fetchOwnedAssets(wallet) {
  const rpcUrl = heliusRpcUrl();
  let page = 1;
  const items = [];
  while (true) {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dumpster-boys',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: wallet,
          page,
          limit: 1000,
          displayOptions: { showFungible: false, showNativeBalance: false },
        },
      }),
    });
    if (!res.ok) throw new Error(`Helius fetch failed: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`Helius error: ${json.error.message}`);
    const batch = json.result?.items || [];
    items.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  return items;
}

async function getHoldings(wallet) {
  const assets = await fetchOwnedAssets(wallet);
  const counts = { silver: 0, gold: 0, diamond: 0, legendary: 0 };
  const legendaryNames = [];
  let maxCapacity = 0;

  for (const item of assets) {
    const inCollection = (item.grouping || []).some(
      g => g.group_key === 'collection' && g.group_value === DUMPSTR_COLLECTION
    );
    if (!inCollection) continue;

    const attrs = item.content?.metadata?.attributes || [];
    const tierAttr = attrs.find(a => (a.trait_type || '').toLowerCase() === 'tier');
    const tier = (tierAttr?.value || '').toLowerCase();

    if (counts[tier] === undefined) continue;
    counts[tier]++;
    if (tier === 'legendary') {
      legendaryNames.push(item.content?.metadata?.name || 'Legendary Dumpster');
    }

    const pluginAttrs = item.plugins?.attributes?.data?.attribute_list || [];
    const capacityEntry = pluginAttrs.find(a => a.key === 'capacity');
    const capacity = capacityEntry ? parseInt(capacityEntry.value, 10) : CAPACITY_BY_TIER[tier];
    maxCapacity += Number.isFinite(capacity) ? capacity : (CAPACITY_BY_TIER[tier] || 0);
  }

  // The 'Tokens Attached' NFT trait does NOT reflect live pool-staked amount
  // (confirmed wrong against the Alley pool page, 2026-07-09) — no reliable
  // public data source found yet for actual staked balance. Left null until one is.
  const actualNftHoldings = null;

  return { counts, legendaryNames, maxCapacity, actualNftHoldings };
}

async function getTokenBalance(wallet) {
  if (!CONFIG.TOKEN_MINT) return null;
  const res = await fetch(heliusRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dumpster-boys-token',
      method: 'getTokenAccountsByOwner',
      params: [wallet, { mint: CONFIG.TOKEN_MINT }, { encoding: 'jsonParsed' }],
    }),
  });
  if (!res.ok) throw new Error(`Helius token fetch failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Helius error: ${json.error.message}`);
  const accounts = json.result?.value || [];
  return accounts.reduce((sum, acc) => {
    const uiAmount = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    return sum + uiAmount;
  }, 0);
}

module.exports = { getHoldings, getTokenBalance, TIERS, TIER_META, DUMPSTR_COLLECTION };
