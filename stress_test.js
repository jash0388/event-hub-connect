
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase URL or Key missing in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateUser(id) {
  const start = Date.now();
  try {
    // 1. Fetch active exams
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (examsError) throw examsError;
    if (!exams || exams.length === 0) return { id, success: false, error: 'No active exams' };

    const examId = exams[0].id;

    // 2. Fetch questions for that exam
    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId);

    if (questionsError) throw questionsError;

    const duration = Date.now() - start;
    return { id, success: true, duration, questionCount: questions?.length || 0 };
  } catch (err) {
    return { id, success: false, error: err.message };
  }
}

async function runStressTest(userCount = 60) {
  console.log(`\n🚀 Starting Stress Test: Simulating ${userCount} concurrent students...`);
  console.log(`🔗 Target: ${supabaseUrl}\n`);

  const startTime = Date.now();
  
  // Launch all requests concurrently
  const promises = Array.from({ length: userCount }, (_, i) => simulateUser(i + 1));
  const results = await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const totalDuration = successful.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = successful.length > 0 ? (totalDuration / successful.length).toFixed(2) : 0;
  const maxDuration = Math.max(...results.map(r => r.duration || 0));

  console.log('--------------------------------------------------');
  console.log(`✅ Completed in: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${successful.length}/${userCount} (${((successful.length/userCount)*100).toFixed(1)}%)`);
  console.log(`⏱️  Average Response: ${avgDuration}ms`);
  console.log(`🔥 Max Response: ${maxDuration}ms`);
  if (failed.length > 0) {
    console.log(`❌ Errors: ${failed.length} (First error: ${failed[0].error})`);
  }
  console.log('--------------------------------------------------\n');

  if (successful.length === userCount && avgDuration < 1000) {
    console.log('VERDICT: PASS ✅');
    console.log(`This system can easily handle ${userCount} students simultaneously fetching questions.`);
  } else {
    console.log('VERDICT: WARNING ⚠️');
    console.log('Some requests were slow or failed. Check Supabase logs or connection.');
  }
}

runStressTest(60);
