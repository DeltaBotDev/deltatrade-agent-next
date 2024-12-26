import { MyDCAVault } from '@delta-trade/core';

export function formatDCAVaultSimple(vault: MyDCAVault) {
  return `${vault.name}: ${vault.side.toUpperCase()} (ROI: ${vault.profit_percent}%)`;
}

export function formatDCAVaultDetailed(vault: MyDCAVault) {
  return `
  Vault: ${vault.name}
  Side: ${vault.side.toUpperCase()}
  Investment: ${vault.investmentAmount}
  Profit: ${vault.profit}
  ROI: ${vault.profit_percent}%
  Status: ${vault.status}
  Created: ${vault.bot_create_time}
  `;
}

export function formatPairSimple(pair: any) {
  return `${pair.name}: ${pair.price} ${pair.quote_token.symbol} (24h: ${pair.change}%)`;
}

export function formatPairDetailed(pair: any) {
  return `
  Trading Pair: ${pair.name}
  Current Price: ${pair.price} ${pair.quote_token.symbol}
  24h Change: ${pair.change}%
  Performance:
    - Daily APY: ${pair.apy_daily}%
    - Weekly APY: ${pair.apy_weekly}%
    - Monthly APY: ${pair.apy_monthly}%
  
  Volume:
    - 24h Volume: ${pair.volume_24h} ${pair.quote_token.symbol}
    - Total Volume: ${pair.volume_total} ${pair.quote_token.symbol}
  
  Trading Features: ${pair.support_dca ? 'DCA ' : ''}${pair.support_grid ? 'Grid ' : ''}${pair.is_mining ? 'Mining' : ''}
  Active Vaults: ${pair.vaults}
  `;
}
