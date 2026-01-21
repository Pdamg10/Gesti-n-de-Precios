import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const data = await request.json()
    
    const setting = await db.setting.upsert({
      where: { settingKey: params.key },
      update: {
        settingValue: data.settingValue,
        taxRate: data.taxRate,
        globalCashea: data.globalCashea,
        globalTransferencia: data.globalTransferencia,
        globalDivisas: data.globalDivisas,
        globalCustom: data.globalCustom,
      },
      create: {
        settingKey: params.key,
        settingValue: data.settingValue,
        taxRate: data.taxRate,
        globalCashea: data.globalCashea,
        globalTransferencia: data.globalTransferencia,
        globalDivisas: data.globalDivisas,
        globalCustom: data.globalCustom,
      }
    })
    
    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}