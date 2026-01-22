export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const XLSX = require('xlsx')
    const { productType } = await request.json()
    
    if (!productType) {
      return NextResponse.json({ error: 'Product type is required' }, { status: 400 })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('productType', productType)
      .order('createdAt', { ascending: false })
    
    if (error) throw error

    // Crear datos para Excel
    const worksheetData = [
      ['Tipo/Marca', 'Medida', 'Precio Lista ($)', 'Precio Lista ($)', 'Ajuste Caucha (%)', 'Ajuste Transferencia (%)', 'Ajuste Divisas (%)', 'Ajuste Personalizado (%)'],
      ...(products || []).map(product => [
        product.type,
        product.medida,
        product.precioListaBs,
        product.precioListaUsd,
        product.adjustmentCashea || '',
        product.adjustmentTransferencia || '',
        product.adjustmentDivisas || '',
        product.adjustmentCustom || ''
      ])
    ]

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // Crear workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, productType === 'cauchos' ? 'Cauchos' : productType === 'baterias' ? 'Baterías' : 'Productos')

    // Generar buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Retornar archivo
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${productType}_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })
  } catch (error: any) {
    console.error('Error exporting to Excel:', error)
    return NextResponse.json({ error: 'Failed to export to Excel', details: error.message }, { status: 500 })
  }
}