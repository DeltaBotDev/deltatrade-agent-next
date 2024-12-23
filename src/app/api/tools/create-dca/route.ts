import { NextResponse } from 'next/server';
import DeltaTradeSDK, { CreateDCAVaultParams } from '@delta-trade/core';

export const runtime = 'edge';

const initSdk =() => DeltaTradeSDK.initEnv({
    chain: 'near',
    network: 'mainnet', 
});

export async function POST({url,headers}: Request) {
    try {
        console.log(headers);
        const mbMetadata: { accountId: string } | undefined =
        // @ts-expect-error headers is not typed
            headers["x-mb"] && JSON.parse(headers["x-mb"] || "");
        const accountId = mbMetadata?.accountId || "near";

        const { searchParams } = new URL(url);

        const sdk = initSdk();

        sdk.changeEnv({
            chain: 'near',
            network: 'mainnet', 
            accountId: accountId,
        });
        
        const pairs = await sdk.getPairs({ type: 'dca' });
        const pairId = searchParams.get('pairId') || pairs[0]?.pair_id;
        
        if (!pairId) {
            return NextResponse.json(
                { error: 'No valid trading pairs found' },
                { status: 400 }
            );
        }
        console.log(searchParams.toString());
        const createParams: CreateDCAVaultParams = {
            pairId,
            tradeType: searchParams.get('tradeType') as "buy" | "sell" || 'buy',
            startTime: Date.now() + 1000 * 60 * 5, 
            intervalTime: parseInt(searchParams.get('intervalTime') || '0'),
            singleAmountIn: parseFloat(searchParams.get('singleAmountIn') || '0'),
            count: parseInt(searchParams.get('count') || '0'),
            name: searchParams.get('name') || 'AI Created DCA Vault',
            recommender: searchParams.get('recommender') || '',
            lowestPrice: parseFloat(searchParams.get('lowestPrice') || '0'),
            highestPrice: parseFloat(searchParams.get('highestPrice') || '0'),
        };

        console.log(createParams);

        const errors = await sdk.validateDCAVaultParams(createParams);
        console.log('errors',errors);
        if (errors) {
            return NextResponse.json(
                { error: 'Parameter validation failed', details: errors },
                { status: 400 }
            );
        }

        const transaction = await sdk.createDCAVault(createParams);

        console.log('transaction',transaction);
        

        return NextResponse.json({
            status: 'success',
            transaction,
            vaultParams: createParams
        });

    } catch (error:any) {
        console.error('Failed to create DCA vault:', error);
        return NextResponse.json(
            { error: 'Failed to create DCA vault', details: error.message },
            { status: 500 }
        );
    }
} 