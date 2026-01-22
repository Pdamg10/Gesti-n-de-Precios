import { NextRequest, NextResponse } from 'next/server'
import { db, supabase } from '@/lib/supabase'
import { notifyRealtimeUpdate } from '@/lib/realtime-notify'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { type, adjustments } = await request.json()
    // type: 'cauchos' | 'baterias'
    // adjustments: { cashea: -10, transferencia: 0, ... } (Delta values)

    if (!type || !adjustments) {
      return NextResponse.json({ error: 'Missing type or adjustments' }, { status: 400 })
    }

    // 1. Fetch all products of this type
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('productType', type)

    if (fetchError) throw fetchError

    // 2. Prepare updates
    const updates = products.map((product: any) => {
      const newValues: any = { id: product.id }
      // Apply deltas to existing adjustments
      // We are adding the delta because "Apply" means "Add this adjustment on top"
      if (adjustments.cashea !== undefined) newValues.adjustmentCashea = (product.adjustmentCashea || 0) + adjustments.cashea
      if (adjustments.transferencia !== undefined) newValues.adjustmentTransferencia = (product.adjustmentTransferencia || 0) + adjustments.transferencia
      if (adjustments.divisas !== undefined) newValues.adjustmentDivisas = (product.adjustmentDivisas || 0) + adjustments.divisas
      if (adjustments.custom !== undefined) newValues.adjustmentCustom = (product.adjustmentCustom || 0) + adjustments.custom
      
      return { ...product, ...newValues }
    })

    if (updates.length > 0) {
      // 3. Upsert batch
      const { error: updateError } = await supabase
        .from('products')
        .upsert(updates)

      if (updateError) throw updateError
    }

    // 4. Notify
    const allProducts = await db.getProducts()
    notifyRealtimeUpdate('products', allProducts)
    
    return NextResponse.json({ success: true, count: updates.length })
  } catch (error) {
    console.error('Error batch updating products:', error)
    return NextResponse.json({ error: 'Failed to batch update' }, { status: 500 })
  }
}
