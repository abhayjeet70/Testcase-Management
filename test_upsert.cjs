const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  console.log("Upserting with zip_file_data...");
  let res1 = await supabase.from('tc_projects').upsert({ id: 'test_upsert_1', project_name: 'Test 1', zip_file_data: '12345', updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
  console.log("Res 1 error:", res1.error);
  
  console.log("Upserting WITHOUT zip_file_data key...");
  let res2 = await supabase.from('tc_projects').upsert({ id: 'test_upsert_1', project_name: 'Test 1 Modified', updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
  console.log("Res 2 error:", res2.error);

  let { data } = await supabase.from('tc_projects').select('*').eq('id', 'test_upsert_1').single();
  console.log("Data after omitted key:", data.zip_file_data);

  console.log("Upserting with zip_file_data as undefined...");
  let res3 = await supabase.from('tc_projects').upsert({ id: 'test_upsert_1', project_name: 'Test 1 Modified 2', zip_file_data: undefined, updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
  console.log("Res 3 error:", res3.error);

  let { data: data2 } = await supabase.from('tc_projects').select('*').eq('id', 'test_upsert_1').single();
  console.log("Data after undefined key:", data2.zip_file_data);

  // cleanup
  await supabase.from('tc_projects').delete().eq('id', 'test_upsert_1');
}
test();
