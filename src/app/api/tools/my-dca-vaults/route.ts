import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';
import { MyDCAVault } from '@delta-trade/core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get('detail') === 'true';

    const sdk = initSdk(request.headers);
    const vaults = await sdk.getMyDCAVaults({
      orderBy: 'profit_24_usd',
      dir: 'desc',
      page: 1,
      pageSize: 100,
    });

    return NextResponse.json({
      vaults,
      display: {
        summary: `Found ${vaults.list.length} DCA vaults`,
        formatted_vaults: vaults.list.map(detail ? formatDCAVaultDetailed : formatDCAVaultSimple),
      },
    });
  } catch (error: any) {
    console.error('Error fetching trading pairs:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch trading pairs' },
      { status: 500 },
    );
  }
}

function formatDCAVaultSimple(vault: MyDCAVault) {
  return `${vault.name}: ${vault.side.toUpperCase()} (ROI: ${vault.profit_percent}%)`;
}

function formatDCAVaultDetailed(vault: MyDCAVault) {
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
