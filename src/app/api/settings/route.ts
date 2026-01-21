import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      orderBy: { settingKey: 'asc' }
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const setting = await db.setting.create({
      data: {
        settingKey: data.settingKey,
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
    console.error('Error creating setting:', error)
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
  }
}