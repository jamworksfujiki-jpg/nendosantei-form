import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, STORAGE_BUCKET } from '@/lib/supabase';
import { z } from 'zod';

export const runtime = 'nodejs';

const PendingFileSchema = z.object({
  rowIndex: z.number().int().min(1).max(50),
  kind: z.enum(['santei', 'roho']),
  filename: z.string().min(1).max(200),
});

const RequestSchema = z.object({
  files: z.array(PendingFileSchema).min(1).max(100),
});

function safeFilename(name: string) {
  return name.replace(/[^\w.\-_]/g, '_').slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const tempId = crypto.randomUUID();
    const supabase = getServiceClient();
    const tickets: Array<{
      rowIndex: number;
      kind: 'santei' | 'roho';
      path: string;
      token: string;
      signedUrl: string;
    }> = [];

    for (const f of parsed.data.files) {
      const safeName = safeFilename(f.filename);
      const path = `pending/${tempId}/${f.rowIndex}_${f.kind}_${safeName}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(path);
      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'failed to issue signed url' }, { status: 500 });
      }
      tickets.push({
        rowIndex: f.rowIndex,
        kind: f.kind,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
      });
    }

    return NextResponse.json({ tempId, tickets });
  } catch (err) {
    console.error('upload-token error', err);
    return NextResponse.json({ error: 'failed to issue upload tokens' }, { status: 500 });
  }
}
