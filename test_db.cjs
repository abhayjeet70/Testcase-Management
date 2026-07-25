const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('tc_projects').select('id, project_name, zip_file_name, zip_file_data').limit(5);
  console.log("Error:", error);
  if (data) {
    data.forEach(d => {
      console.log(`ID: ${d.id}, Name: ${d.project_name}, ZipName: ${d.zip_file_name}, ZipData length: ${d.zip_file_data ? d.zip_file_data.length : 'null'}`);
    });
  }
}
test();
