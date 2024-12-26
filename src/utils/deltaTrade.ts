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
    const accountId = mbMetadata?.accountId;
    if (!accountId) {
      throw new Error('No account id');
    }

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
