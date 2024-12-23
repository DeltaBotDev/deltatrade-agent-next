import { NextResponse } from "next/server";

export const runtime = 'edge';


const key = JSON.parse(process.env.BITTE_KEY || "{}");
const config = JSON.parse(process.env.BITTE_CONFIG || "{}");

if (!key?.accountId) {
    console.error("no account");
}

export async function GET() {
    const pluginData = {
        openapi: "3.0.0",
        info: {
            title: "Delta Trade DCA Bot",
            description: "API for creating and managing DCA trading bots on NEAR",
            version: "1.0.0",
        },
        servers: [
            {
                url: config.url||"https://agent-api.deltatrade.ai",
            },
        ],
        "x-mb": {
            "account-id": key.accountId,
            assistant: {
                name: "Delta Trade DCA Assistant",
                description: "An assistant that helps users create and manage DCA trading strategies on NEAR",
                instructions: "You help users set up Dollar Cost Averaging (DCA) trading strategies on NEAR. Use the tools to create DCA vaults and provide trading information.",
                tools: [
                    { type: "create-dca" },
                    { type: "get-pairs" }
                ],
                image:'https://assets.deltatrade.ai/assets/img/logo-b.svg'
            },
        },
        paths: {
            "/api/tools/create-dca": {
                post: {
                    operationId: "createDcaVault",
                    summary: "Create DCA Trading Bot",
                    description: "Create a DCA (Dollar Cost Averaging) trading bot on NEAR network",
                    parameters: [
                        {
                            name: "pairId",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "Trading pair ID, uses default pair if not provided"
                        },
                        {
                            name: "tradeType",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string",
                                enum: ["buy", "sell"],
                                default: "buy"
                            },
                            description: "Trade type: buy or sell"
                        },
                        {
                            name: "intervalTime",
                            in: "query",
                            required: true,
                            schema: {
                                type: "integer",
                                minimum: 0
                            },
                            description: "Trading interval in seconds"
                        },
                        {
                            name: "singleAmountIn",
                            in: "query",
                            required: true,
                            schema: {
                                type: "number",
                                minimum: 0
                            },
                            description: "Amount to trade in each execution"
                        },
                        {
                            name: "count",
                            in: "query",
                            required: true,
                            schema: {
                                type: "integer",
                                minimum: 1
                            },
                            description: "Number of trades to execute"
                        },
                        {
                            name: "name",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "Name of the trading bot"
                        },
                        {
                            name: "recommender",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "Recommender account ID"
                        },
                        {
                            name: "lowestPrice",
                            in: "query",
                            required: false,
                            schema: {
                                type: "number",
                                minimum: 0
                            },
                            description: "Lowest price limit for trading"
                        },
                        {
                            name: "highestPrice",
                            in: "query",
                            required: false,
                            schema: {
                                type: "number",
                                minimum: 0
                            },
                            description: "Highest price limit for trading"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successfully created DCA trading bot",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            status: {
                                                type: "string",
                                                description: "Creation status"
                                            },
                                            transaction: {
                                                type: "array",
                                                description: "Transaction data to be signed"
                                            },
                                            vaultParams: {
                                                type: "object",
                                                description: "Created bot parameters"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Invalid parameters",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            },
                                            details: {
                                                type: "object",
                                                description: "Detailed error information"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            },
                                            details: {
                                                type: "string",
                                                description: "Detailed error information"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/tools/create-transaction": {
                get: {
                    operationId: "createNearTransaction",
                    summary: "Create a NEAR transaction payload",
                    description: "Generates a NEAR transaction payload for transferring tokens",
                    parameters: [
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the receiver"
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The amount of NEAR tokens to transfer"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            transactionPayload: {
                                                type: "object",
                                                properties: {
                                                    receiverId: {
                                                        type: "string",
                                                        description: "The receiver's NEAR account ID"
                                                    },
                                                    actions: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                type: {
                                                                    type: "string",
                                                                    description: "The type of action (e.g., 'Transfer')"
                                                                },
                                                                params: {
                                                                    type: "object",
                                                                    properties: {
                                                                        deposit: {
                                                                            type: "string",
                                                                            description: "The amount to transfer in yoctoNEAR"
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/tools/get-blockchains": {
                get: {
                    summary: "get blockchain information",
                    description: "Respond with a list of blockchains",
                    operationId: "get-blockchains",
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            message: {
                                                type: "string",
                                                description: "The list of blockchains",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "/api/tools/get-user": {
                get: {
                    summary: "get user information",
                    description: "Respond with user account ID",
                    operationId: "get-user",
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            accountId: {
                                                type: "string",
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
            "/api/tools/reddit": {
                get: {
                    summary: "get Reddit frontpage posts",
                    description: "Fetch and return a list of posts from the Reddit frontpage",
                    operationId: "get-reddit-posts",
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            posts: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        title: {
                                                            type: "string",
                                                            description: "The title of the post"
                                                        },
                                                        author: {
                                                            type: "string",
                                                            description: "The username of the post author"
                                                        },
                                                        subreddit: {
                                                            type: "string",
                                                            description: "The subreddit where the post was made"
                                                        },
                                                        score: {
                                                            type: "number",
                                                            description: "The score (upvotes) of the post"
                                                        },
                                                        num_comments: {
                                                            type: "number",
                                                            description: "The number of comments on the post"
                                                        },
                                                        url: {
                                                            type: "string",
                                                            description: "The URL of the post on Reddit"
                                                        }
                                                    }
                                                },
                                                description: "An array of Reddit posts"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/tools/twitter": {
                get: {
                    operationId: "getTwitterShareIntent",
                    summary: "Generate a Twitter share intent URL",
                    description: "Creates a Twitter share intent URL based on provided parameters",
                    parameters: [
                        {
                            name: "text",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The text content of the tweet"
                        },
                        {
                            name: "url",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "The URL to be shared in the tweet"
                        },
                        {
                            name: "hashtags",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "Comma-separated hashtags for the tweet"
                        },
                        {
                            name: "via",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "The Twitter username to attribute the tweet to"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            twitterIntentUrl: {
                                                type: "string",
                                                description: "The generated Twitter share intent URL"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/tools/get-pairs": {
                get: {
                    operationId: "getPairs",
                    summary: "Get Available Trading Pairs",
                    description: "Retrieve list of available trading pairs. Can filter by type.",
                    parameters: [
                        {
                            name: "type",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string",
                                enum: ["dca", "grid", "swing"],
                                description: "Type of trading pairs to retrieve. If not provided, returns all pairs."
                            }
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successfully retrieved trading pairs",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            pairs: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        pair_id: {
                                                            type: "string",
                                                            description: "Unique identifier for the trading pair"
                                                        },
                                                        base_token: {
                                                            type: "string",
                                                            description: "Base token symbol"
                                                        },
                                                        quote_token: {
                                                            type: "string",
                                                            description: "Quote token symbol"
                                                        },
                                                        base_decimals: {
                                                            type: "integer",
                                                            description: "Decimals of base token"
                                                        },
                                                        quote_decimals: {
                                                            type: "integer",
                                                            description: "Decimals of quote token"
                                                        }
                                                    }
                                                },
                                                description: "List of available trading pairs"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    };

    return NextResponse.json(pluginData);
}