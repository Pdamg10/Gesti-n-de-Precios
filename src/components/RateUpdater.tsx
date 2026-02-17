'use client'

import { useEffect } from 'react'

export default function RateUpdater() {
    useEffect(() => {
        const updateRate = async () => {
            // 1. Check if we already updated today
            const today = new Date().toISOString().split('T')[0]
            const lastUpdate = localStorage.getItem('last_rate_update')

            if (lastUpdate === today) {
                console.log('✅ Rate already updated today')
                return
            }

            try {
                console.log('🔄 Checking for BCV rate update...')
                const res = await fetch('/api/cron/update-rate')
                if (!res.ok) throw new Error('Update failed')

                const data = await res.json()
                console.log('✅ Rate updated:', data)

                // 2. Mark as updated for today
                localStorage.setItem('last_rate_update', today)

            } catch (error) {
                console.error('❌ Error updating rate:', error)
            }
        }

        // Delay slightly to not block initial render
        const timer = setTimeout(updateRate, 2000)
        return () => clearTimeout(timer)
    }, [])

    return null // This component renders nothing
}
