// Shared config — used by both the browser (plain <script> global) and Node (require()).
// Add the DUMPSTR token mint address once it launches to light up token balances + price.
const CONFIG = {
  TOKEN_MINT: '9bmvoZZphKMmNxVbQ2q8AwvHRwENAYcYMTSK39jaCHDa',
};
if (typeof module !== 'undefined') module.exports = CONFIG;
