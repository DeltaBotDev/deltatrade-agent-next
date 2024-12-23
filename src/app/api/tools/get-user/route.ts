import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {

  const headersList = headers();
  const mbMetadata = JSON.parse(headersList.get('mb-metadata') || '{}');
  const accountId = mbMetadata?.accountData?.accountId || 'near';

  return NextResponse.json({ accountId: accountId });
}
