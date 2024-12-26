import DeltaTradeSDK from '@delta-trade/core';

export class SDKManager {
  private static instance: SDKManager;
  private sdk: DeltaTradeSDK | null = null;
  private currentAccountId: string | null = null;

  private constructor() {}

  public static getInstance(): SDKManager {
    if (!SDKManager.instance) {
      SDKManager.instance = new SDKManager();
    }
    return SDKManager.instance;
  }

  public getSDK(headers: any): DeltaTradeSDK {
    const mbMetadata = JSON.parse(headers.get('mb-metadata') || '{}');
    const accountId = mbMetadata?.accountId || 'near';

    if (!this.sdk || this.currentAccountId !== accountId) {
      this.sdk = DeltaTradeSDK.initEnv({
        chain: 'near',
        network: 'mainnet',
        accountId,
      });
      this.currentAccountId = accountId;
    }

    return this.sdk;
  }
}

export function initSdk(headers: any): DeltaTradeSDK {
  return SDKManager.getInstance().getSDK(headers);
}

export function generateETag(content: any): string {
  return `W/"${Buffer.from(JSON.stringify(content)).toString('base64')}"`;
}

export function handleResponse(response: any, corsHeaders: any, status: number = 200) {
  return new Response(status === 304 ? null : JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function handleError(error: any, corsHeaders: any, status: number = 500) {
  return new Response(JSON.stringify({ error: error.message || 'Failed to fetch pair prices' }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
