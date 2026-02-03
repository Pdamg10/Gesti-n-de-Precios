export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export async function GET() {
  try {
    const settings = await db.getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Delete existing settings with this key to prevent duplicates
    await db.deleteSetting(data.settingKey)
    
    // Generate ID if not provided
    if (!data.id) {
      data.id = `setting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    const setting = await db.createSetting(data)
    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error creating setting:', error)
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
  }
}