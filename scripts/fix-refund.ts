import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRefund() {
  const { data: refunds, error } = await supabase
    .from('order_refunds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching refunds:', error)
    return
  }

  console.log('Recent refunds:')
  for (const r of (refunds || [])) {
    console.log(`  ID: ${r.id}, Order: ${r.order_id}, Amount: $${r.refund_amount}, Commission: $${r.commission_reversed}, Bank: $${r.bank_fee_reversed}, Txn: $${r.transaction_fee_reversed}, HST: $${r.hst_reversed}, Adjustment ID: ${r.adjustment_id}`)
  }
}

fixRefund()
