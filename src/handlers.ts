import { initSdk, generateETag, handleResponse, handleError } from './utils';
import { CreateDCAVaultParams } from '@delta-trade/core';
import { Env } from './worker';
import {
  formatPairDetailed,
  formatPairSimple,
  formatDCAVaultDetailed,
  formatDCAVaultSimple,
} from './format';

const DEFAULT_PAIR_ID =
  'wrap.near:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';

export async function handleAIPlugin(request: Request, corsHeaders: any, env: Env) {
  try {
    const key = JSON.parse(env.BITTE_KEY || '{}');
    const config = JSON.parse(env.BITTE_CONFIG || '{}');
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
              - Convert the answer to milliseconds:
                * Daily/每天/day/once a day → 86400000 milliseconds
                * Weekly/每周/week/once a week → 604800000 milliseconds (default recommendation)
                * Monthly/每月/month/once a month → 2592000000 milliseconds
              - Any interval >= 60000 milliseconds is supported
              - Common English patterns: "every X days", "X times per week", "once a month"

            2. Amount per trade (singleAmountIn)
              - If missing, ask: "How much do you want to trade each time?"
              - For buy orders: amount in quote token (e.g., USDC)
              - For sell orders: amount in base token (e.g., NEAR)
              - Minimum amount: 20 (USDC for buy, NEAR for sell)
              - Common patterns: 
                * "total X USDC for Y trades" → divide X by Y
                * "X USDC per trade"
                * "invest X USDC each time"

            3. Trade type (tradeType)
              - If unclear, analyze user intent to determine buy/sell
              - Default to 'buy' if ambiguous
              - Buy indicators: "buy", "purchase", "invest in", "DCA into"
              - Sell indicators: "sell", "dispose", "exchange for"
              - Affects how singleAmountIn is interpreted

            4. Count (number of executions)
              - If missing, ask: "How many times do you want to execute this plan?"
              - Between 5 and 52 executions
              - Common patterns: "X times", "X trades", "repeat X times"

            Process and Guidelines:
            1. First check current market prices using get-pair-prices
            2. Analyze user input for all required parameters
            3. Ask follow-up questions for ANY missing parameters
            4. Only proceed with plan creation when all parameters are collected
            5. Show complete plan details including:
               - Trading pair (default to NEAR/USDC)
               - Investment amount per trade
               - Interval in both seconds and human-readable format
               - Total investment calculation
               - Current market price
               - Optional price range if specified

            Example dialogue:
            User: "I want to buy NEAR"
            Assistant: I'll help you set up a DCA plan for NEAR. I need some details:
            1. How often do you want to trade? (daily, weekly, monthly)
            2. How much USDC do you want to spend on each trade?
            3. How many times would you like to execute this plan?

            User: "Total 100 USDC, daily trades for 5 days"
            Assistant: I'll help you create a DCA plan with:
            - Interval: daily (86400 seconds)
            - Amount per trade: 20 USDC (100 USDC total ÷ 5 trades)
            - Number of executions: 5
            - Trade type: buy
            Is this correct? I'll proceed with creating the plan.

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
            - Custom strategy: Help calculate appropriate interval based on user's goals

            NEVER generate the final JSON until all required parameters are confirmed.
            Always verify the final parameters match user's intent.`,
          tools: [
            {
              type: 'generate-transaction',
            },
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
              {
                name: 'detail',
                in: 'query',
                required: false,
                schema: {
                  type: 'boolean',
                  default: false,
                  description: 'Whether to return detailed information about trading pairs.',
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
                              pair_db_id: {
                                type: 'integer',
                                description: 'Database ID of the trading pair',
                                example: 1,
                              },
                              pair_id: {
                                type: 'string',
                                description: 'Unique identifier for the trading pair',
                                example:
                                  'wrap.near:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
                              },
                              name: {
                                type: 'string',
                                description: 'Display name of the trading pair',
                                example: 'NEAR/USDC',
                              },
                              base_token: {
                                type: 'object',
                                description: 'Base token information',
                                properties: {
                                  id: { type: 'integer', description: 'Token database ID' },
                                  code: { type: 'string', description: 'Token contract address' },
                                  symbol: { type: 'string', description: 'Token symbol' },
                                  name: { type: 'string', description: 'Full token name' },
                                  icon: { type: 'string', description: 'Token icon URL' },
                                  decimals: {
                                    type: 'integer',
                                    description: 'Token decimal places',
                                  },
                                  oracle_id: {
                                    type: 'string',
                                    description: 'Oracle identifier for price feeds',
                                  },
                                },
                              },
                              quote_token: {
                                type: 'object',
                                description: 'Quote token information',
                                properties: {
                                  id: { type: 'integer', description: 'Token database ID' },
                                  code: { type: 'string', description: 'Token contract address' },
                                  symbol: { type: 'string', description: 'Token symbol' },
                                  name: { type: 'string', description: 'Full token name' },
                                  icon: { type: 'string', description: 'Token icon URL' },
                                  decimals: {
                                    type: 'integer',
                                    description: 'Token decimal places',
                                  },
                                  oracle_id: {
                                    type: 'string',
                                    description: 'Oracle identifier for price feeds',
                                  },
                                },
                              },
                              is_main: {
                                type: 'boolean',
                                description: 'Whether this is a main trading pair',
                              },
                              is_meme: {
                                type: 'boolean',
                                description: 'Whether this is a meme token pair',
                              },
                              is_warn: {
                                type: 'boolean',
                                description: 'Whether this pair has active warnings',
                              },
                              is_mining: {
                                type: 'boolean',
                                description: 'Whether mining rewards are available',
                              },
                              support_dca: {
                                type: 'boolean',
                                description: 'DCA trading support status',
                              },
                              support_grid: {
                                type: 'boolean',
                                description: 'Grid trading support status',
                              },
                              market_cap_volume: {
                                type: 'string',
                                description: 'Market cap volume',
                              },
                              ranking: { type: 'integer', description: 'Pair ranking' },
                              type: { type: 'string', description: 'Trading pair type' },
                              price: { type: 'string', description: 'Current price' },
                              pair_price: { type: 'string', description: 'Trading pair price' },
                              change: {
                                type: 'string',
                                description: '24h price change percentage',
                              },
                              volume_24h: { type: 'string', description: '24h trading volume' },
                              volume_total: { type: 'string', description: 'Total trading volume' },
                              apy_daily: { type: 'string', description: 'Daily APY percentage' },
                              apy_daily_bot_id: {
                                type: 'integer',
                                description: 'Best performing daily bot ID',
                              },
                              apy_weekly: { type: 'string', description: 'Weekly APY percentage' },
                              apy_weekly_bot_id: {
                                type: 'integer',
                                description: 'Best performing weekly bot ID',
                              },
                              apy_monthly: {
                                type: 'string',
                                description: 'Monthly APY percentage',
                              },
                              apy_monthly_bot_id: {
                                type: 'integer',
                                description: 'Best performing monthly bot ID',
                              },
                              liquidity: { type: 'string', description: 'Available liquidity' },
                              market_cap: { type: 'string', description: 'Market capitalization' },
                              volatility: {
                                type: 'string',
                                description: 'Price volatility indicator',
                              },
                              vaults: { type: 'integer', description: 'Number of active vaults' },
                              symbol: { type: 'string', description: 'Trading pair symbol' },
                              types: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Supported trading types',
                              },
                              chain: { type: 'string', description: 'Blockchain network' },
                            },
                          },
                        },
                        display: {
                          type: 'object',
                          description: 'Formatted display information',
                          properties: {
                            summary: {
                              type: 'string',
                              description: 'Summary of retrieved pairs',
                              example: 'Found 3 trading pairs',
                            },
                            formatted_pairs: {
                              type: 'array',
                              items: {
                                type: 'string',
                                description: 'Formatted pair information',
                              },
                              description: 'Array of formatted pair information strings',
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
              'Get transaction payloads for creating a DCA (Dollar Cost Averaging) plan. Returns the transaction information that needs to be signed.',
            parameters: [
              {
                name: 'pairId',
                in: 'query',
                schema: {
                  type: 'string',
                  default: DEFAULT_PAIR_ID,
                },
                description: `Trading pair ID (defaults to ${DEFAULT_PAIR_ID})`,
              },
              {
                name: 'tradeType',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                  enum: ['buy', 'sell'],
                  default: 'buy',
                },
                description:
                  'Trading direction. AI will analyze user intent to determine whether to buy or sell',
              },
              {
                name: 'intervalTime',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                  default: 604800000,
                },
                description: 'Time interval between each investment in milliseconds',
              },
              {
                name: 'startTime',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                },
                description: 'Start time of the DCA plan in seconds since epoch',
              },
              {
                name: 'singleAmountIn',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                  minimum: 10,
                },
                description: 'Amount to invest per time',
              },
              {
                name: 'count',
                in: 'query',
                required: true,
                schema: {
                  type: 'integer',
                  minimum: 5,
                  maximum: 52,
                },
                description: 'Number of times to execute',
              },
              {
                name: 'lowestPrice',
                in: 'query',
                schema: {
                  type: 'number',
                },
                description: 'Optional lowest price limit',
              },
              {
                name: 'highestPrice',
                in: 'query',
                schema: {
                  type: 'number',
                },
                description: 'Optional highest price limit',
              },
              {
                name: 'name',
                in: 'query',
                schema: {
                  type: 'string',
                },
                description: 'Name for the DCA plan. AI will generate if not provided',
              },
            ],
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
        '/api/tools/get-my-dca-vaults': {
          get: {
            operationId: 'get-my-dca-vaults',
            summary: 'Get My DCA Vaults',
            description: 'Retrieve all DCA vaults owned by the current user.',
            responses: {
              '200': {
                description: 'Successfully retrieved DCA vaults',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        list: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              index: {
                                type: 'number',
                                description: 'Index number',
                              },
                              name: {
                                type: 'string',
                                description: 'Vault name',
                              },
                              side: {
                                type: 'string',
                                description: 'Trading side (buy/sell)',
                              },
                              investmentAmount: {
                                type: 'string',
                                description: 'Investment amount',
                              },
                              profit: {
                                type: 'string',
                                description: 'Profit amount',
                              },
                              profit_percent: {
                                type: 'string',
                                description: 'Historical ROI percentage',
                              },
                              status: {
                                type: 'string',
                                description: 'Vault status',
                              },
                              bot_create_time: {
                                type: 'string',
                                description: 'Creation time',
                              },
                              id: {
                                type: 'string',
                                description: 'Vault ID',
                              },
                            },
                          },
                        },
                        display: {
                          type: 'object',
                          description: 'Formatted display information',
                          properties: {
                            summary: {
                              type: 'string',
                              description: 'Summary of vaults',
                              example: 'Found 2 DCA vaults',
                            },
                            formatted_vaults: {
                              type: 'array',
                              items: {
                                type: 'string',
                                description: 'Formatted vault information',
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

export async function handleGetPairs(request: Request, corsHeaders: any) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || ('dca' as any);
    const detail = url.searchParams.get('detail') === 'true';

    const sdk = initSdk(request.headers);
    const pairs = await sdk.getPairs({ type });

    return handleResponse(
      {
        pairs,
        display: {
          summary: `Found ${pairs.length} trading pairs`,
          formatted_pairs: pairs.map(detail ? formatPairDetailed : formatPairSimple),
        },
      },
      corsHeaders,
    );
  } catch (error: any) {
    console.error(error);
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleGetPairPrices(request: Request, corsHeaders: any) {
  try {
    const url = new URL(request.url);
    let pairIds = url.searchParams.get('pairIds')?.split(',');
    const sdk = initSdk(request.headers);
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
    const accountId = mbMetadata?.accountId || 'near';

    const url = new URL(request.url);
    const createParams: CreateDCAVaultParams = {
      pairId: url.searchParams.get('pairId') || DEFAULT_PAIR_ID,
      tradeType: url.searchParams.get('tradeType') as 'buy' | 'sell',
      intervalTime: Number(url.searchParams.get('intervalTime')),
      singleAmountIn: Number(url.searchParams.get('singleAmountIn')),
      count: Number(url.searchParams.get('count')),
      lowestPrice: url.searchParams.get('lowestPrice')
        ? Number(url.searchParams.get('lowestPrice'))
        : undefined,
      highestPrice: url.searchParams.get('highestPrice')
        ? Number(url.searchParams.get('highestPrice'))
        : undefined,
      name: url.searchParams.get('name') || `dca-${accountId}`,
      startTime: url.searchParams.get('startTime')
        ? Number(url.searchParams.get('startTime'))
        : Date.now() + 5 * 60 * 1000,
    };

    console.log('handleCreateDCA/createParams', createParams);
    const sdk = initSdk(request.headers);

    const errors = await sdk.validateDCAVaultParams(createParams);
    if (errors) {
      console.log('handleCreateDCA/validateDCAVaultParams errors', errors);
      return handleError({ message: 'DCA validation failed', details: errors }, corsHeaders, 400);
    }

    const transactions = await sdk.createDCAVault(createParams);
    console.log('handleCreateDCA/transactions', transactions);
    return handleResponse(transactions, corsHeaders);
  } catch (error: any) {
    console.error('handleCreateDCA/catch', error?.message);
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleGetMyDCAVaults(request: Request, corsHeaders: any) {
  try {
    const url = new URL(request.url);
    const detail = url.searchParams.get('detail') === 'true';

    const sdk = initSdk(request.headers);
    const vaults = await sdk.getMyDCAVaults({
      orderBy: 'profit_24_usd',
      dir: 'desc',
      page: 1,
      pageSize: 100,
    });

    return handleResponse(
      {
        ...vaults,
        display: {
          summary: `Found ${vaults.list.length} DCA vaults`,
          formatted_vaults: vaults.list.map(detail ? formatDCAVaultDetailed : formatDCAVaultSimple),
        },
      },
      corsHeaders,
    );
  } catch (error: any) {
    console.error(error);
    return handleError(error, corsHeaders, 500);
  }
}
