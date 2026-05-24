import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_NAME = 'book-covers';

/**
 * POST /api/upload — Upload a book cover image to Supabase Storage
 * Accepts multipart/form-data with a 'file' field
 * Returns the public URL of the uploaded image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed.' },
        { status: 400 }
      );
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be under 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `cover_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Try to create the bucket if it doesn't exist (first-time setup)
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      if (!bucketExists) {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
      }
    } catch (bucketErr) {
      console.warn('Bucket check/create warning (may already exist):', bucketErr);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // Cache for 1 year
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to upload image.' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
