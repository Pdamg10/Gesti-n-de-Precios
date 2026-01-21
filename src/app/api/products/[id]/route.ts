import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    const product = await db.product.update({
      where: { id: params.id },
      data: {
        type: data.type,
        medida: data.medida,
        precioListaBs: data.precioListaBs,
        precioListaUsd: data.precioListaUsd,
        adjustmentCashea: data.adjustmentCashea,
        adjustmentTransferencia: data.adjustmentTransferencia,
        adjustmentDivisas: data.adjustmentDivisas,
        adjustmentCustom: data.adjustmentCustom,
      }
    })
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.product.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}