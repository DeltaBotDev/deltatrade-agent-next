import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || ('dca' as any);
    const detail = searchParams.get('detail') === 'true';

    const sdk = initSdk(request.headers);
    const pairs = await sdk.getPairs({ type });

    return NextResponse.json({
      pairs,
      display: {
        summary: `Found ${pairs.length} trading pairs`,
        formatted_pairs: pairs.map(detail ? formatPairDetailed : formatPairSimple),
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

function formatPairSimple(pair: any) {
  return `${pair.name}: ${pair.price} ${pair.quote_token.symbol} (24h: ${pair.change}%)`;
}

function formatPairDetailed(pair: any) {
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
