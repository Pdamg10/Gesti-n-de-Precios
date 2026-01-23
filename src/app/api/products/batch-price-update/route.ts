import { NextRequest, NextResponse } from 'next/server'
import { db, supabase } from '@/lib/supabase'
import { notifyRealtimeUpdate } from '@/lib/realtime-notify'
import { roundToNearest5 } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { type, percentageBs, percentageUsd } = await request.json()
    // type: 'cauchos' | 'baterias'
    // percentageBs: 10 (means +10%)
    // percentageUsd: -5 (means -5%)

    if (!type) {
      return NextResponse.json({ error: 'Missing type' }, { status: 400 })
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
      
      if (percentageBs !== undefined && percentageBs !== 0) {
        const multiplier = 1 + (percentageBs / 100)
        const newPriceRaw = product.precioListaBs * multiplier
        newValues.precioListaBs = Math.max(0, roundToNearest5(newPriceRaw))
      }
      
      if (percentageUsd !== undefined && percentageUsd !== 0) {
        const multiplier = 1 + (percentageUsd / 100)
        const newPriceRaw = product.precioListaUsd * multiplier
        newValues.precioListaUsd = Math.max(0, roundToNearest5(newPriceRaw))
      }
      
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
    console.error('Error batch updating prices:', error)
    return NextResponse.json({ error: 'Failed to batch update prices' }, { status: 500 })
  }
}
