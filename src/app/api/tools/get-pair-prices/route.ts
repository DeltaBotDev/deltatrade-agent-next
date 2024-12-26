import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let pairIds = searchParams.get('pairIds')?.split(',');
    const sdk = initSdk(request.headers);
    if (!pairIds) pairIds = (await sdk.getPairs()).map((p) => p.pair_id);
    const pairPrices = await sdk.getPairPrices(pairIds);

    return NextResponse.json({
      pairPrices,
    });
  } catch (error: any) {
    console.error('Error fetching trading pairs:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch trading pairs' },
      { status: 500 },
    );
  }
}
