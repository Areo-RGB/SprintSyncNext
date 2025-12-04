import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = 'https://svhrkymvonkkdscflsjn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aHJreW12b25ra2RzY2Zsc2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODc1NjMsImV4cCI6MjA4MDE2MzU2M30.jkk6lDp7DZPIPfBKTOT8AZhzg_-4VpTSV8kCZSr1V54';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);