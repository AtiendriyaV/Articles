'use server';

import { revalidatePath } from 'next/cache';
import { uploadArticle, calculateReadTime } from '@/lib/googleDrive';
import { PublishArticlePayload } from '@/lib/types';

export interface PublishActionResult {
  success: boolean;
  message: string;
  slug?: string;
  fileId?: string;
}

/**
 * Next.js Server Action: publishArticleAction
 * 
 * Invoked by the Admin Writing Portal (/admin/write).
 * 1. Authenticates request against ADMIN_SECRET_KEY.
 * 2. Validates article schema and slug format.
 * 3. Converts markdown and frontmatter, uploading to Google Drive.
 * 4. Invokes Next.js ISR cache revalidation for the home feed and article slug.
 */
export async function publishArticleAction(
  formData: FormData | PublishArticlePayload
): Promise<PublishActionResult> {
  try {
    // 1. Extract inputs (supports either FormData or JSON payload)
    let title = '';
    let slug = '';
    let content = '';
    let excerpt = '';
    let tags: string[] = [];
    let passcode = '';
    let author = 'Atiendriya Verma';

    if (formData instanceof FormData) {
      title = (formData.get('title') as string) || '';
      slug = (formData.get('slug') as string) || '';
      content = (formData.get('content') as string) || '';
      excerpt = (formData.get('excerpt') as string) || '';
      passcode = (formData.get('passcode') as string) || '';
      author = (formData.get('author') as string) || 'Atiendriya Verma';
      const rawTags = (formData.get('tags') as string) || '';
      tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      title = formData.title || '';
      slug = formData.slug || '';
      content = formData.content || '';
      excerpt = formData.excerpt || '';
      passcode = formData.passcode || '';
      author = formData.author || 'Atiendriya Verma';
      tags = formData.tags || [];
    }

    // 2. Security Passcode Verification (Backed by ADMIN_SECRET_KEY env var)
    const serverSecret = process.env.ADMIN_SECRET_KEY || 'alpha-research-2026';
    if (!passcode || passcode.trim() !== serverSecret.trim()) {
      return {
        success: false,
        message: 'Unauthorized: Invalid Admin Secret Key. Access denied.',
      };
    }

    // 3. Validation
    if (!title.trim()) {
      return { success: false, message: 'Article title is required.' };
    }
    if (!content.trim()) {
      return { success: false, message: 'Article markdown content cannot be empty.' };
    }

    // Clean or auto-generate slug
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const readTime = calculateReadTime(content);
    const finalExcerpt = excerpt.trim() || content.slice(0, 150).replace(/[#*`_]/g, '') + '...';
    const finalTags = tags.length > 0 ? tags : ['Equity Research', 'Capital Markets'];

    // 4. Invoke Drive Helper to save file to Google Drive
    const result = await uploadArticle({
      title: title.trim(),
      slug: cleanSlug,
      content: content.trim(),
      excerpt: finalExcerpt,
      tags: finalTags,
      readTime,
      author,
    });

    // 5. Trigger Next.js ISR Revalidation if in Next.js environment
    try {
      if (typeof revalidatePath === 'function') {
        revalidatePath('/');
        revalidatePath(`/blog/${cleanSlug}`);
      }
    } catch {
      // Gracefully ignore when executed outside Next.js runtime
    }

    return {
      success: result.success,
      message: result.message,
      slug: cleanSlug,
      fileId: result.fileId,
    };
  } catch (error: any) {
    console.error('publishArticleAction error:', error);
    return {
      success: false,
      message: `Failed to publish article: ${error?.message || 'Internal Server Error'}`,
    };
  }
}
