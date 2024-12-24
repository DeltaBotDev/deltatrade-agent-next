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

            4. Important: Always confirm plan details before creation
               Show a summary like this:
               "Please confirm your DCA plan:
               - Trading pair: NEAR/USDC
               - Investment amount: [X] USDC per time
               - Frequency: [Weekly/Monthly]
               - Duration: [X] weeks/months
               - Total investment: [X] USDC
               - Current NEAR price: [X] USDC
               
               Would you like to proceed with this plan?"

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
            2. Confirm plan details before creation
            3. Explain investment strategy clearly
            4. Be responsive to user's questions`,
          tools: [{ type: 'get-pairs' }, { type: 'get-pair-prices' }, { type: 'create-dca' }],
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
                                description: 'Base token symbol',
                              },
                              quote_token: {
                                type: 'string',
                                description: 'Quote token symbol',
                              },
                              base_decimals: {
                                type: 'integer',
                                description: 'Decimals of base token',
                              },
                              quote_decimals: {
                                type: 'integer',
                                description: 'Decimals of quote token',
                              },
                            },
                          },
                          description: 'List of available trading pairs',
                        },
                      },
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
                          description: 'Prices of trading pairs',
                        },
                      },
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
                description: 'DCA plan created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          description: 'Creation status',
                        },
                        plan: {
                          type: 'object',
                          properties: {
                            summary: {
                              type: 'string',
                              description:
                                'Plan summary, e.g., "Buy NEAR with 10 USDC weekly for 12 weeks"',
                            },
                            nextInvestment: {
                              type: 'string',
                              format: 'date-time',
                              description: 'Next investment time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid parameters',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          description: 'Error message',
                        },
                        details: {
                          type: 'object',
                          description: 'Detailed error information',
                        },
                      },
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
                        details: {
                          type: 'string',
                          description: 'Detailed error information',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/tools/create-transaction': {
          get: {
            operationId: 'createNearTransaction',
            summary: 'Create a NEAR transaction payload',
            description: 'Generates a NEAR transaction payload for transferring tokens',
            parameters: [
              {
                name: 'receiverId',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                },
                description: 'The NEAR account ID of the receiver',
              },
              {
                name: 'amount',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                },
                description: 'The amount of NEAR tokens to transfer',
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        transactionPayload: {
                          type: 'object',
                          properties: {
                            receiverId: {
                              type: 'string',
                              description: "The receiver's NEAR account ID",
                            },
                            actions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  type: {
                                    type: 'string',
                                    description: "The type of action (e.g., 'Transfer')",
                                  },
                                  params: {
                                    type: 'object',
                                    properties: {
                                      deposit: {
                                        type: 'string',
                                        description: 'The amount to transfer in yoctoNEAR',
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
              '400': {
                description: 'Bad request',
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
              '500': {
                description: 'Error response',
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
        '/api/tools/get-blockchains': {
          get: {
            summary: 'get blockchain information',
            description: 'Respond with a list of blockchains',
            operationId: 'get-blockchains',
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          description: 'The list of blockchains',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/tools/get-user': {
          get: {
            summary: 'get user information',
            description: 'Respond with user account ID',
            operationId: 'get-user',
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        accountId: {
                          type: 'string',
                          description: "The user's account ID",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/tools/reddit': {
          get: {
            summary: 'get Reddit frontpage posts',
            description: 'Fetch and return a list of posts from the Reddit frontpage',
            operationId: 'get-reddit-posts',
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        posts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              title: {
                                type: 'string',
                                description: 'The title of the post',
                              },
                              author: {
                                type: 'string',
                                description: 'The username of the post author',
                              },
                              subreddit: {
                                type: 'string',
                                description: 'The subreddit where the post was made',
                              },
                              score: {
                                type: 'number',
                                description: 'The score (upvotes) of the post',
                              },
                              num_comments: {
                                type: 'number',
                                description: 'The number of comments on the post',
                              },
                              url: {
                                type: 'string',
                                description: 'The URL of the post on Reddit',
                              },
                            },
                          },
                          description: 'An array of Reddit posts',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Error response',
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
        '/api/tools/twitter': {
          get: {
            operationId: 'getTwitterShareIntent',
            summary: 'Generate a Twitter share intent URL',
            description: 'Creates a Twitter share intent URL based on provided parameters',
            parameters: [
              {
                name: 'text',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                },
                description: 'The text content of the tweet',
              },
              {
                name: 'url',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                },
                description: 'The URL to be shared in the tweet',
              },
              {
                name: 'hashtags',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                },
                description: 'Comma-separated hashtags for the tweet',
              },
              {
                name: 'via',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                },
                description: 'The Twitter username to attribute the tweet to',
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        twitterIntentUrl: {
                          type: 'string',
                          description: 'The generated Twitter share intent URL',
                        },
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
                          description: 'Error message',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Error response',
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

    return handleResponse(
      { status: 'success', transaction, vaultParams: createParams },
      corsHeaders,
    );
  } catch (error: any) {
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleGetBlockchains(request: Request, corsHeaders: any) {
  const blockchains = [
    'Bitcoin',
    'Ethereum',
    'Cardano',
    'Polkadot',
    'Solana',
    'Avalanche',
    'Binance Smart Chain',
    'Tezos',
    'Algorand',
    'Cosmos',
    'Near',
    'Aptos',
    'Sui',
    'Starknet',
    'ZKsync',
    'Scroll',
    'Optimism',
    'Arbitrum',
  ];

  const randomBlockchains = blockchains.sort(() => 0.5 - Math.random()).slice(0, 3);

  return handleResponse({ blockchains: randomBlockchains }, corsHeaders);
}

export async function handleTwitter(request: Request, corsHeaders: any) {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  const shareUrl = url.searchParams.get('url');
  const hashtags = url.searchParams.get('hashtags');
  const via = url.searchParams.get('via');

  if (!text) {
    return handleError({ message: 'Text parameter is required' }, corsHeaders, 400);
  }

  let twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  if (shareUrl) twitterIntentUrl += `&url=${encodeURIComponent(shareUrl)}`;
  if (hashtags) twitterIntentUrl += `&hashtags=${encodeURIComponent(hashtags)}`;
  if (via) twitterIntentUrl += `&via=${encodeURIComponent(via)}`;

  return handleResponse({ twitterIntentUrl }, corsHeaders);
}

export async function handleReddit(request: Request, corsHeaders: any) {
  try {
    const response = await fetch('https://www.reddit.com/.json');
    if (!response.ok) {
      throw new Error('Failed to fetch Reddit frontpage');
    }
    const data = await response.json();

    const posts = data.data.children.map((child: any) => ({
      title: child.data.title,
      author: child.data.author,
      subreddit: child.data.subreddit,
      score: child.data.score,
      num_comments: child.data.num_comments,
      url: `https://www.reddit.com${child.data.permalink}`,
    }));

    return handleResponse({ posts }, corsHeaders);
  } catch (error: any) {
    console.error(error);
    return handleError(error, corsHeaders, 500);
  }
}

export async function handleCreateTransaction(request: Request, corsHeaders: any) {
  const url = new URL(request.url);
  const receiverId = url.searchParams.get('receiverId');
  const amount = url.searchParams.get('amount');

  if (!receiverId || !amount) {
    return handleError(
      { message: 'receiverId and amount are required parameters' },
      corsHeaders,
      400,
    );
  }

  const amountInYoctoNEAR = Number(amount) * 10 ** 24;

  const transactionPayload = {
    receiverId,
    actions: [
      {
        type: 'Transfer',
        params: {
          deposit: amountInYoctoNEAR,
        },
      },
    ],
  };

  return handleResponse({ transactionPayload }, corsHeaders);
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
