import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const product = await db.product.create({
      data: {
        productType: data.productType || 'cauchos',
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
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}