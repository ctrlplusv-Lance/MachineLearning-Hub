import { createClient } from '@supabase/supabase-js'

// You must wrap the URL and Key in quotes!
const supabaseUrl = 'https://imzovdwbbiccqbpwvyee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltem92ZHdiYmljY3FicHd2eWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzQ2MzksImV4cCI6MjA5MTc1MDYzOX0.4Jn00JUiInGcLKLZEcsAWJ-nUonCGmvQ-c-e2-ErCY4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)