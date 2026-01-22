import { NextRequest, NextResponse } from 'next/server'
import { db, supabase } from '@/lib/supabase'
import { notifyRealtimeUpdate } from '@/lib/realtime-notify'

export async function POST(request: NextRequest) {
  try {
    const backupData = await request.json()
    
    // Basic validation
    if (!backupData.products || !backupData.settings) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
    }
    
    const { products, settings } = backupData
    
    // 1. Restore Products
    // Using upsert to update existing and insert new
    if (products.length > 0) {
      // Clean data for upsert (remove properties that might cause issues if they don't match schema exactly)
      const cleanProducts = products.map((p: any) => {
        // Ensure numeric values are numbers
        const clean = { ...p }
        if (clean.precioListaBs) clean.precioListaBs = Number(clean.precioListaBs)
        if (clean.precioListaUsd) clean.precioListaUsd = Number(clean.precioListaUsd)
        // Remove derived or UI-only fields if any (usually backup is clean from DB)
        return clean
      })

      const { error: productsError } = await supabase
        .from('products')
        .upsert(cleanProducts, { onConflict: 'id' })
      
      if (productsError) {
        console.error('Error restoring products:', productsError)
        return NextResponse.json({ error: 'Failed to restore products: ' + productsError.message }, { status: 500 })
      }
    }

    // 2. Restore Settings
    if (settings.length > 0) {
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert(settings, { onConflict: 'settingKey' })
      
      if (settingsError) {
        console.error('Error restoring settings:', settingsError)
        return NextResponse.json({ error: 'Failed to restore settings: ' + settingsError.message }, { status: 500 })
      }
    }
    
    // Notify realtime clients
    const allProducts = await db.getProducts()
    notifyRealtimeUpdate('products', allProducts)
    
    const allSettings = await db.getSettings()
    notifyRealtimeUpdate('settings', allSettings)
    
    return NextResponse.json({ success: true, message: 'Database restored successfully' })
  } catch (error) {
    console.error('Error restoring database:', error)
    return NextResponse.json({ error: 'Internal server error during restore' }, { status: 500 })
  }
}
