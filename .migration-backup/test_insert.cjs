const { createClient } = require('./node_modules/@supabase/supabase-js');
require('./node_modules/dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('exam_submissions').insert({
    exam_id: '00000000-0000-0000-0000-000000000000', // invalid but we'll see the error
    user_id: 'test',
    student_name: 'test',
    roll_number: 'test',
    exam_title: 'test',
    results_breakdown: []
  });
  console.log("Error:", error);
}
test();
