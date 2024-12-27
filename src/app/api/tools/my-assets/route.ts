import { NextResponse } from 'next/server';
import { initSdk } from '@/utils/deltaTrade';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get('detail') === 'true';

    const sdk = initSdk(request.headers);
    const assets = await sdk.getAccountAssets();

    return NextResponse.json({
      assets,
      display: {
        summary: `Found ${assets.length} tokens`,
        formatted_assets: assets.map(detail ? formatAssetDetailed : formatAssetSimple),
      },
    });
  } catch (error: any) {
    console.error('Error fetching account assets:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch account assets' },
      { status: 500 },
    );
  }
}

function formatAssetSimple(asset: any) {
  return `${asset.token.symbol}: ${asset.balance} (Internal: ${asset.internalBalance})`;
}

function formatAssetDetailed(asset: any) {
  return `
    Token: ${asset.token.symbol}
    Balance: ${asset.balance}
    Price: ${asset.price}
    Internal Balance: ${asset.internalBalance}
    Token Address: ${asset.token.code}
  `;
}
