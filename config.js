// Shared config — used by both the browser (plain <script> global) and Node (require()).
// Add the DUMPSTR token mint address once it launches to light up token balances + price.
const CONFIG = {
  TOKEN_MINT: '', // e.g. 'Xyz123...' — set after launch
};
if (typeof module !== 'undefined') module.exports = CONFIG;
