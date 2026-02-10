import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'menuca_v3' } }
)

async function fixRefund() {
  // Get the order details for proper calculation
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, subtotal, total_amount')
    .eq('id', 160)
    .single()

  console.log('Order:', order)

  // Get commission config for restaurant 829
  const { data: config } = await supabase
    .from('restaurant_commission_configs')
    .select('*')
    .eq('restaurant_id', 829)
    .single()

  console.log('Commission config:', config)

  const commissionRateRaw = (config as any)?.commission_rate ?? 10
  const commissionRate = commissionRateRaw > 1 ? commissionRateRaw / 100 : commissionRateRaw
  const subtotal = order?.subtotal || 0
  const totalAmount = order?.total_amount || 36.16
  const refundAmount = 36.16
  const refundRatio = refundAmount / totalAmount

  const correctCommission = Math.round((subtotal * commissionRate * refundRatio) * 100) / 100
  const correctBankFee = Math.round((totalAmount * 0.029 * refundRatio) * 100) / 100
  const correctTxnFee = Math.round((0.30 * refundRatio) * 100) / 100
  const correctServiceTotal = correctCommission + correctBankFee + correctTxnFee
  const correctHst = Math.round((correctServiceTotal * 0.13) * 100) / 100

  console.log(`\nCorrected values:`)
  console.log(`  Commission Rate Raw: ${commissionRateRaw}, Decimal: ${commissionRate}`)
  console.log(`  Subtotal: $${subtotal}, Total: $${totalAmount}, Ratio: ${refundRatio}`)
  console.log(`  Commission: $${correctCommission} (was $256)`)
  console.log(`  Bank Fee: $${correctBankFee} (was $1.05)`)
  console.log(`  Txn Fee: $${correctTxnFee} (was $0.30)`)
  console.log(`  HST: $${correctHst} (was $33.46)`)

  // Update the order_refunds record
  const { error: updateErr } = await (supabase as any)
    .from('order_refunds')
    .update({
      commission_reversed: correctCommission,
      bank_fee_reversed: correctBankFee,
      transaction_fee_reversed: correctTxnFee,
      hst_reversed: correctHst,
    })
    .eq('id', 1)

  if (updateErr) {
    console.error('\nFailed to update order_refunds:', updateErr)
  } else {
    console.log('\norder_refunds record UPDATED successfully')
  }

  // Verify the update
  const { data: updated } = await (supabase as any)
    .from('order_refunds')
    .select('id, commission_reversed, bank_fee_reversed, transaction_fee_reversed, hst_reversed')
    .eq('id', 1)
    .single()
  console.log('\nVerified record:', updated)
}

fixRefund()
