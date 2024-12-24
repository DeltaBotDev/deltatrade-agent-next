import DeltaTradeSDK from '@delta-trade/core';
import { Env } from './worker';

function generateETag(content: any): string {
  return `W/"${Buffer.from(JSON.stringify(content)).toString('base64')}"`;
}

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
          name: 'Delta Trade DCA Helper',
          description:
            'A friendly assistant that helps you set up DCA plans to buy NEAR and other tokens',
          instructions: `You are a DCA (Dollar-Cost Averaging) trading assistant. Your task is to help users create DCA plans.

            When analyzing user input, you MUST check for these required parameters:
            1. Trading interval (intervalTime)
              - If missing, ask: "How often do you want to trade? (e.g., daily, weekly, monthly)"
              - Convert the answer to seconds:
                * Daily: 86400 seconds
                * Weekly: 604800 seconds (default recommendation)
                * Monthly: 2592000 seconds
              - Any interval >= 60 seconds is supported

            2. Amount per trade (singleAmountIn)
              - If missing, ask: "How much do you want to trade each time?"
              - For buy orders: amount in quote token (e.g., USDC)
              - For sell orders: amount in base token (e.g., NEAR)
              - Minimum amount: 20 (USDC for buy, NEAR for sell)

            3. Trade type (tradeType)
              - If unclear, analyze user intent to determine buy/sell
              - Default to 'buy' if ambiguous
              - Affects how singleAmountIn is interpreted

            4. Count (number of executions)
              - Between 5 and 52 executions
              - If missing, ask: "How many times do you want to execute this plan?"

            Process and Guidelines:
            1. First check current market prices using get-pair-prices
            2. Analyze user input for all required parameters
            3. Ask follow-up questions for any missing parameters
            4. Only proceed with plan creation when all parameters are collected
            5. Show complete plan details including:
               - Trading pair (default to NEAR/USDC)
               - Investment amount per trade
               - Interval in both seconds and human-readable format
               - Total investment calculation
               - Current market price
               - Optional price range if specified

            Example dialogue:
            User: "I want to buy NEAR when price is between 5.5 and 5.6"
            Assistant: I see you want to set up a DCA plan. I need a few more details:
            1. How often do you want to trade? (daily, weekly, monthly)
            2. How much USDC do you want to spend on each trade?
            3. How many times would you like to execute this plan?

            Important Reminders:
            1. Always explain that user needs to sign transaction
            2. Plan starts only after transaction is signed
            3. Be conversational but professional
            4. Confirm understanding of user inputs
            5. Explain any assumptions made

            Common scenarios:
            - New user: Suggest weekly intervals (604800 seconds)
            - Active trader: Support shorter intervals if requested
            - Long-term investor: Recommend monthly intervals
            - Custom strategy: Help calculate appropriate interval based on user's goals`,
          tools: [
            { type: 'generate-transaction' },
            { type: 'get-pair-prices' },
            { type: 'get-pairs' },
            { type: 'get-dca-transactions' },
          ],
          image: 'https://assets.deltatrade.ai/assets/img/logo-b.svg',
        },
      },
      paths: {
        '/api/tools/get-pairs': {
          get: {
            operationId: 'get-pairs',
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
            operationId: 'get-pair-prices',
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
            operationId: 'get-dca-transactions',
            description:
              'Get transaction payloads for creating a DCA (Dollar Cost Averaging) plan on Delta Trade.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['tradeType', 'intervalTime', 'singleAmountIn', 'count'],
                    properties: {
                      pairId: {
                        type: 'string',
                        default:
                          'wrap.near:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
                        description: 'Trading pair ID (defaults to NEAR/USDC)',
                      },
                      tradeType: {
                        type: 'string',
                        enum: ['buy', 'sell'],
                        default: 'buy',
                        description:
                          'Trading direction. AI will analyze user intent to determine whether to buy or sell. Defaults to "buy" if ambiguous',
                      },
                      intervalTime: {
                        type: 'number',
                        default: 604800,
                        description:
                          'Time interval between each investment in seconds. AI will convert user-friendly terms (daily, weekly, monthly) to seconds. Common intervals: daily (86400), weekly (604800), monthly (2592000)',
                      },
                      singleAmountIn: {
                        type: 'number',
                        minimum: 10,
                        default: 10,
                        description:
                          'Amount to invest per time. For buy orders, amount is in quote token (e.g., USDC). For sell orders, amount is in base token (e.g., NEAR)',
                      },
                      count: {
                        type: 'integer',
                        minimum: 5,
                        maximum: 52,
                        default: 5,
                        description:
                          'Number of times the DCA order will execute. Each execution will invest singleAmountIn at intervalTime intervals',
                      },
                      name: {
                        type: 'string',
                        description:
                          'Name for the DCA plan. AI will generate a creative name if not provided, based on the trading strategy and parameters (e.g., "Weekly NEAR Accumulation Plan")',
                      },
                      lowestPrice: {
                        type: 'number',
                        description:
                          'Optional lowest price limit. If not provided, AI will suggest based on current market price and historical data',
                      },
                      highestPrice: {
                        type: 'number',
                        description:
                          'Optional highest price limit. If not provided, AI will suggest based on current market price and historical data',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Returns an array of transactions that need to be signed and executed',
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

    const etag = generateETag(pluginData);
    const ifNoneMatch = request.headers.get('If-None-Match');

    if (ifNoneMatch === etag) {
      return handleResponse(
        null,
        { ...corsHeaders, ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' },
        304,
      );
    }

    return handleResponse(
      pluginData,
      { ...corsHeaders, ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' },
      200,
    );
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

function handleResponse(response: any, corsHeaders: any, status: number = 200) {
  return new Response(status === 304 ? null : JSON.stringify(response), {
    status,
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
