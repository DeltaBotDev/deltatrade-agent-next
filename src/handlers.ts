import DeltaTradeSDK from '@delta-trade/core';
import { Env } from './worker';

export async function handleAIPlugin(request: Request, corsHeaders: any, env: Env) {
  try {
    console.log('handleAIPlugin', env);
    const key = JSON.parse(env.BITTE_KEY || '{}');
    const config = JSON.parse(env.BITTE_CONFIG || '{}');
    console.log('key', key);
    if (!key?.accountId) {
      console.error('no account');
    }

    const pluginData = {
      openapi: '3.0.0',
      info: {
        title: 'Delta Trade DCA Bot',
        description: 'API for creating and managing DCA trading bots on NEAR',
        version: '1.0.0',
      },
      servers: [
        {
          url: config.url,
        },
      ],
      'x-mb': {
        'account-id': key.accountId,
        assistant: {
          name: 'NEAR DCA Helper',
          description:
            'A friendly assistant that helps you set up DCA plans to buy NEAR and other tokens',
          instructions: `You are a helpful DCA assistant for NEAR Protocol. Your main tasks are:

            1. Help users set up DCA plans (default to NEAR/USDC)
               - First check current NEAR price using get-pair-prices
               - Recommend investment amount based on market conditions
               - Default to weekly frequency for beginners
               - Suggest 12-week plans as a starting point

            2. Explain available trading pairs
               - Use get-pairs to show available options
               - Default to NEAR/USDC but mention other pairs
               - Explain pros/cons of different pairs

            3. Guide investment strategy
               - Recommend weekly or monthly for better fee efficiency
               - Explain how DCA reduces price volatility risk
               - Help calculate potential investment outcomes

            4. Important: Always explain the two-step process
               Step 1: Review the plan details:
               "Here's your proposed DCA plan:
               - Trading pair: NEAR/USDC
               - Investment amount: [X] USDC per time
               - Frequency: [Weekly/Monthly]
               - Duration: [X] weeks/months
               - Total investment: [X] USDC
               - Current NEAR price: [X] USDC"

               Step 2: Explain next steps:
               "If these details look correct, I'll generate a transaction for you to sign.
               You'll need to approve this transaction in your NEAR wallet to start the DCA plan.
               The plan will only begin after you sign the transaction."

            5. Risk awareness
               - Explain market volatility
               - Emphasize long-term perspective
               - Mention that past performance doesn't guarantee future results

            Common scenarios:
            - New user: Recommend weekly investment into NEAR for 12 weeks
            - Price check: Show current prices and recent trends
            - Advanced user: Show other trading pairs and custom strategies

            Always:
            1. Check current prices first
            2. Show plan details clearly
            3. Explain that user needs to sign transaction
            4. Remind that plan starts only after transaction is signed
            5. Be ready to help if transaction signing fails`,
          tools: [
            { type: 'get-pairs' },
            { type: 'get-pair-prices' },
            { type: 'create-dca' },
            { type: 'generate-transaction' },
          ],
          image: 'https://assets.deltatrade.ai/assets/img/logo-b.svg',
        },
      },
      paths: {
        '/api/tools/get-pairs': {
          get: {
            operationId: 'getPairs',
            summary: 'Get Available Trading Pairs',
            description: 'Retrieve list of available trading pairs. Can filter by type.',
            parameters: [
              {
                name: 'type',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                  enum: ['dca', 'grid', 'swing'],
                  description:
                    'Type of trading pairs to retrieve. If not provided, returns all pairs.',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Successfully retrieved trading pairs',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        pairs: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              pair_id: {
                                type: 'string',
                                description: 'Unique identifier for the trading pair',
                              },
                              base_token: {
                                type: 'string',
                                description: 'Base token contract ID or symbol',
                              },
                              quote_token: {
                                type: 'string',
                                description: 'Quote token contract ID or symbol',
                              },
                              base_decimals: {
                                type: 'integer',
                                description: 'Decimal places for base token',
                              },
                              quote_decimals: {
                                type: 'integer',
                                description: 'Decimal places for quote token',
                              },
                            },
                            required: [
                              'pair_id',
                              'base_token',
                              'quote_token',
                              'base_decimals',
                              'quote_decimals',
                            ],
                          },
                        },
                      },
                      required: ['pairs'],
                    },
                  },
                },
              },
              '500': {
                description: 'Server error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          description: 'Error message',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/tools/get-pair-prices': {
          get: {
            operationId: 'getPairPrices',
            summary: 'Get Prices of Trading Pairs',
            description: 'Retrieve the current prices of all trading pairs',
            parameters: [
              {
                name: 'pairIds',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                  description: 'Comma-separated list of pair IDs to retrieve prices for',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Successfully retrieved trading pair prices',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        pairPrices: {
                          type: 'object',
                          additionalProperties: {
                            type: 'object',
                            properties: {
                              pair_id: {
                                type: 'string',
                                description: 'Unique identifier for the trading pair',
                              },
                              basePrice: {
                                type: 'string',
                                description: 'Price in terms of base token',
                              },
                              quotePrice: {
                                type: 'string',
                                description: 'Price in terms of quote token',
                              },
                              pairPrice: {
                                type: 'string',
                                description: 'Calculated pair price (basePrice/quotePrice)',
                              },
                            },
                            required: ['pair_id', 'basePrice', 'quotePrice', 'pairPrice'],
                          },
                          description: 'Map of pair IDs to their current prices',
                        },
                      },
                      required: ['pairPrices'],
                    },
                  },
                },
              },
            },
          },
        },
        '/api/tools/create-dca': {
          post: {
            operationId: 'createDcaVault',
            summary: 'Create Simple DCA Plan',
            description: 'Create a DCA plan to buy NEAR with USDC',
            parameters: [
              {
                name: 'pairId',
                in: 'query',
                schema: {
                  type: 'string',
                  default:
                    'wrap.near:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
                },
                description: 'Trading pair ID (defaults to NEAR/USDC)',
              },
              {
                name: 'interval',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly'],
                  default: 'weekly',
                },
                description: 'Investment frequency: daily/weekly/monthly',
              },
              {
                name: 'amount',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                  minimum: 5,
                  maximum: 1000,
                  default: 10,
                },
                description: 'Amount of USDC to invest per time',
              },
              {
                name: 'totalTimes',
                in: 'query',
                required: true,
                schema: {
                  type: 'integer',
                  minimum: 4,
                  maximum: 52,
                  default: 12,
                },
                description: 'Total number of investments (recommended 12 or more)',
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          signerId: {
                            type: 'string',
                            description: 'The account ID that will sign the transaction',
                          },
                          receiverId: {
                            type: 'string',
                            description:
                              'The account ID of the contract that will receive the transaction',
                          },
                          actions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  description: 'The type of action to perform',
                                },
                                params: {
                                  type: 'object',
                                  properties: {
                                    methodName: {
                                      type: 'string',
                                      description: 'The name of the method to be called',
                                    },
                                    args: {
                                      type: 'object',
                                      description: 'Arguments for the function call',
                                    },
                                    gas: {
                                      type: 'string',
                                      description: 'Amount of gas to attach to the transaction',
                                    },
                                    deposit: {
                                      type: 'string',
                                      description: 'Amount to deposit with the transaction',
                                    },
                                  },
                                  required: ['methodName', 'args', 'gas', 'deposit'],
                                },
                              },
                              required: ['type', 'params'],
                            },
                          },
                        },
                        required: ['signerId', 'receiverId', 'actions'],
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          description: 'The error message',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    return handleResponse(pluginData, corsHeaders);
  } catch (error) {
    console.error('Error in AI Plugin:', error);
    return handleError(error, corsHeaders, 500);
  }
}

function initSdk(accountId?: string) {
  return DeltaTradeSDK.initEnv({
    chain: 'near',
    network: 'mainnet',
    accountId: accountId,
  });
}

export async function handleGetPairs(request: Request, corsHeaders: any) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || ('dca' as any);

    const sdk = initSdk();
    const pairs = await sdk.getPairs({ type });

    return handleResponse({ pairs }, corsHeaders);
  } catch (error: any) {
    console.error(error);
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleGetPairPrices(request: Request, corsHeaders: any) {
  try {
    const url = new URL(request.url);
    let pairIds = url.searchParams.get('pairIds')?.split(',');
    const sdk = initSdk();
    if (!pairIds) pairIds = (await sdk.getPairs({ type: 'dca' })).map((p) => p.pair_id);
    const pairPrices = await sdk.getPairPrices(pairIds);
    return handleResponse({ pairPrices }, corsHeaders);
  } catch (error) {
    console.error(error);
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleCreateDCA(request: Request, corsHeaders: any) {
  try {
    if (request.method !== 'POST') {
      return handleError({ message: 'Method not allowed' }, corsHeaders, 405);
    }

    const headersList = request.headers;
    const mbMetadata = JSON.parse(headersList.get('mb-metadata') || '{}');
    const accountId = mbMetadata?.accountData?.accountId || 'near';

    const createParams = await request.json();
    const sdk = initSdk(accountId);
    console.log('createParams', createParams);
    if (!createParams.startTime) {
      // default to 5 minutes from now
      createParams.startTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }

    const errors = await sdk.validateDCAVaultParams(createParams);
    if (errors) {
      return handleError({ message: 'DCA validation failed', details: errors }, corsHeaders, 400);
    }

    const transaction = await sdk.createDCAVault(createParams);

    return handleResponse(transaction, corsHeaders);
  } catch (error: any) {
    return handleError(error, corsHeaders, 500);
  }
}

function handleResponse(response: any, corsHeaders: any) {
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function handleError(error: any, corsHeaders: any, status: number = 500) {
  return new Response(JSON.stringify({ error: error.message || 'Failed to fetch pair prices' }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
