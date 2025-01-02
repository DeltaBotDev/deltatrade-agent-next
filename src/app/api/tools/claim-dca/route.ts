import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get('vaultId');

    if (!vaultId) {
      return NextResponse.json({ error: 'vaultId parameter is required' }, { status: 400 });
    }

    const sdk = initSdk(request.headers);
    const transactions = await sdk.claimDCAVault(vaultId);

    console.log('handleClaimDCA/transactions', JSON.stringify(transactions));
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error claiming DCA vault rewards:', error);
    return NextResponse.json(
      { error: 'Failed to claim DCA vault rewards', details: error.message },
      { status: 500 },
    );
  }
}
