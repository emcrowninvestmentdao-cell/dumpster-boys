const { getHoldings, getTokenBalance } = require('../lib/holdings');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const walletsParam = req.query.wallets || '';
  const wallets = walletsParam.split(',').map(w => w.trim()).filter(Boolean);

  if (!wallets.length) {
    res.status(400).json({ error: 'missing wallets param' });
    return;
  }

  try {
    const results = await Promise.all(
      wallets.map(async wallet => {
        const [holdings, tokenBalance] = await Promise.all([
          getHoldings(wallet),
          getTokenBalance(wallet),
        ]);
        return [wallet, { ...holdings, tokenBalance }];
      })
    );
    const out = Object.fromEntries(results);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
