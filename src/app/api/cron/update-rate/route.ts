
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase Client (Service Role for writing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
    try {
        // 1. Fetch current rate from DolarAPI
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
            next: { revalidate: 60 } // Cache for 60 seconds
        })

        if (!res.ok) throw new Error('Failed to fetch rate')

        const data = await res.json()
        const rate = data.promedio.toString()

        // 2. Update Database
        const { error } = await supabase
            .from('settings')
            .upsert({
                settingKey: 'exchange_rate',
                settingValue: rate
            }, { onConflict: 'settingKey' })

        if (error) throw error

        return NextResponse.json({
            success: true,
            rate: rate,
            message: 'Exchange rate updated successfully'
        })

    } catch (error: any) {
        console.error('Error updating rate:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
