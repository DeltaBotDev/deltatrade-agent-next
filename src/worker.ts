/* eslint-disable import/no-anonymous-default-export */
import { handleGetPairs, handleCreateDCA, handleAIPlugin, handleGetPairPrices } from './handlers';

export interface Env {
  BITTE_KEY?: string;
  BITTE_CONFIG?: string;
  NEAR_ENV?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      switch (path) {
        case '/api/ai-plugin':
        case '/.well-known/ai-plugin.json':
          return await handleAIPlugin(request, corsHeaders, env);
        case '/api/tools/get-pairs':
          return await handleGetPairs(request, corsHeaders);
        case '/api/tools/get-pair-prices':
          return await handleGetPairPrices(request, corsHeaders);
        case '/api/tools/create-dca':
          return await handleCreateDCA(request, corsHeaders);
        default:
          return new Response('Not Found', {
            status: 404,
            headers: corsHeaders,
          });
      }
    } catch (err) {
      console.error('Error handling request:', err);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};
