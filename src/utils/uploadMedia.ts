import { supabase } from '../lib/supabase';
import { generateId } from './storage';

/**
 * Uploads a file to a specific Supabase storage bucket
 * @param file The file to upload
 * @param bucket 'screenshots' | 'project_files'
 * @returns The public URL of the uploaded file
 */
export const uploadFileToSupabase = async (file: File, bucket: string): Promise<string> => {
  try {
    // Check if the user is authenticated (RLS requires auth)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("You must be logged in to upload files.");
    }

    // Sanitize file name and create a unique path
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${generateId()}_${cleanFileName}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error(`Upload error to ${bucket}:`, uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error(`Failed to upload to ${bucket}:`, error);
    throw error;
  }
};
