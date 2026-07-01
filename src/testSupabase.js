import { supabase } from './supabase/client'

async function test() {
  const { data, error } = await supabase.from('projects').select('*')
  if (error) {
    console.error('❌ Supabase error:', error.message)
  } else {
    console.log('✅ Connected! Projects:', data)
  }
}

test()