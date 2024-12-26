import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';
import { CreateDCAVaultParams } from '@delta-trade/core';
import { DEFAULT_PAIR_ID } from '@/config';

export async function POST(request: Request) {
  try {
    const headersList = request.headers;
    const mbMetadata = JSON.parse(headersList.get('mb-metadata') || '{}');
    const accountId = mbMetadata?.accountId || 'near';

    const url = new URL(request.url);
    const { searchParams } = url;
    const createParams: CreateDCAVaultParams = {
      pairId: searchParams.get('pairId') || DEFAULT_PAIR_ID,
      tradeType: searchParams.get('tradeType') as 'buy' | 'sell',
      intervalTime: Number(searchParams.get('intervalTime')),
      singleAmountIn: Number(searchParams.get('singleAmountIn')),
      count: Number(searchParams.get('count')),
      lowestPrice: searchParams.get('lowestPrice')
        ? Number(searchParams.get('lowestPrice'))
        : undefined,
      highestPrice: searchParams.get('highestPrice')
        ? Number(searchParams.get('highestPrice'))
        : undefined,
      name: searchParams.get('name') || `dca-${accountId}`,
      startTime: searchParams.get('startTime')
        ? Number(searchParams.get('startTime'))
        : Date.now() + 5 * 60 * 1000,
    };

    console.log('handleCreateDCA/createParams', createParams);
    const sdk = initSdk(request.headers);

    const errors = await sdk.validateDCAVaultParams(createParams);
    if (errors) {
      console.log('handleCreateDCA/validateDCAVaultParams errors', errors);
      return NextResponse.json(
        { message: 'DCA validation failed', details: JSON.stringify(errors) },
        { status: 400 },
      );
    }

    const transactions = await sdk.createDCAVault(createParams);
    console.log('handleCreateDCA/transactions', transactions);

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Failed to create DCA vault:', error);
    return NextResponse.json(
      { error: 'Failed to create DCA vault', details: error.message },
      { status: 500 },
    );
  }
}
