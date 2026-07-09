import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking profiles table...");
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Error fetching profiles:", error.message);
  } else {
    console.log("Profiles table fetched successfully.");
    if (data.length > 0) {
      console.log("Sample profile:", Object.keys(data[0]));
    } else {
      console.log("Profiles table is empty, but query succeeded.");
    }
  }

  // Also check if we can insert a dummy row? No need yet.
}

main();
