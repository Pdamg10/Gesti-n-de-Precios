export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { notifyRealtimeUpdate } from '@/lib/realtime-notify'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const data = await request.json()
    
    // Construct settingData only with defined values to avoid issues with undefined
    const settingData: any = {
      settingKey: key,
    }
    
    if (data.settingValue !== undefined) settingData.settingValue = data.settingValue
    if (data.taxRate !== undefined) settingData.taxRate = data.taxRate
    if (data.globalCashea !== undefined) settingData.globalCashea = data.globalCashea
    if (data.globalTransferencia !== undefined) settingData.globalTransferencia = data.globalTransferencia
    if (data.globalDivisas !== undefined) settingData.globalDivisas = data.globalDivisas
    if (data.globalCustom !== undefined) settingData.globalCustom = data.globalCustom
    
    // Validar que hay algo que actualizar
    if (Object.keys(settingData).length <= 1) { // Solo settingKey
      // Si no hay campos para actualizar, pero tenemos el key, 
      // y si settingValue es lo único que se envía pero es null/undefined...
      // En este caso, asumimos que si se llama a este endpoint es para upsert
      // Pero si data está vacío, podría ser un problema.
      
      if (data.settingValue === undefined) {
         // Si realmente no hay nada, retornamos success sin hacer nada
         return NextResponse.json({ success: true, message: 'No changes detected' })
      }
    }

    // Asegurar que si settingValue es undefined, no se envíe en el objeto si es un partial update,
    // pero para upsert necesitamos enviar lo que queremos guardar.
    // El problema puede ser que db.upsertSetting espera un objeto completo o válido según la tabla.
    
    // Forzar settingValue a null si no existe, o manejarlo como string vacío si la DB lo requiere?
    // Asumamos que la DB acepta NULL en settingValue si no es requerido.
    // Si la columna es requerida, esto fallará.
    
    // Intento de corrección: Asegurarse de que el objeto pasado a upsert sea válido para Supabase
    // Si upsert falla, intentemos update primero si existe, o insert si no.
    
    // Usar onConflict strategy explícita si es necesario, pero upsert(data) suele funcionar.
    
    const setting = await db.upsertSetting(settingData)
    
    // Notify realtime
    try {
      const allSettings = await db.getSettings()
      notifyRealtimeUpdate('settings', allSettings)
    } catch (e) {
      console.error('Realtime update failed', e)
    }
    
    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}