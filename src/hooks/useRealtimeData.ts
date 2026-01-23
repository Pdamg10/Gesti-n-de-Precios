'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Product {
  id: string
  productType: string
  type: string
  medida: string
  precioListaBs: number
  precioListaUsd: number
  adjustmentCashea?: number
  adjustmentTransferencia?: number
  adjustmentDivisas?: number
  adjustmentCustom?: number
  createdAt: string
  updatedAt: string
}

interface Setting {
  id: string
  settingKey: string
  settingValue?: string
  taxRate?: number
  globalCashea?: number
  globalTransferencia?: number
  globalDivisas?: number
  globalCustom?: number
  createdAt: string
  updatedAt: string
}

export interface ConnectedUser {
  id: string
  socketId: string // We'll map Supabase presence_ref to this for compatibility
  userType: 'admin' | 'worker'
  name?: string
  lastName?: string
  connectedAt: string
  lastActivity: string
}

interface RealtimeData {
  products: Product[]
  settings: Setting[]
}

// Mock socket interface for backward compatibility
interface MockSocket {
  id: string
  connected: boolean
  emit: (event: string, data?: any) => void
  on: (event: string, cb: any) => void
  off: (event: string, cb?: any) => void
  close: () => void
}

export function useRealtimeData(userType: 'admin' | 'worker' = 'worker', userInfo?: { name?: string, lastName?: string }) {
  const [socket, setSocket] = useState<MockSocket | null>(null)
  const [data, setData] = useState<RealtimeData>({ products: [], settings: [] })
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Refs to keep track of latest user info inside callbacks without re-subscribing
  const userInfoRef = useRef(userInfo)
  const userTypeRef = useRef(userType)

  useEffect(() => {
    userInfoRef.current = userInfo
    userTypeRef.current = userType
  }, [userInfo, userType])

  // Load data function
  const loadDataFromAPI = useCallback(async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/settings')
      ])
      
      if (productsRes.ok && settingsRes.ok) {
        const [products, settings] = await Promise.all([
          productsRes.json(),
          settingsRes.json()
        ])
        setData({ products, settings })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [])

  useEffect(() => {
    // Initial data load
    loadDataFromAPI()

    // Create a unique ID for this session to mimic socket.id
    const sessionId = 'user-' + Math.random().toString(36).substring(2, 15)

    // Setup Supabase Channel
    const newChannel = supabase.channel('room1')
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState()
        const uniqueUsers = new Map<string, ConnectedUser>()
        
        // Transform presence state to ConnectedUser array with deduplication
        Object.keys(state).forEach(key => {
          state[key].forEach((presence: any) => {
            // Create a unique key based on user identity (Name + Lastname + Type)
            // This prevents duplicate entries when a user has multiple tabs open
            const identifier = `${presence.name || ''}-${presence.lastName || ''}-${presence.userType || ''}`.toLowerCase()
            
            if (!uniqueUsers.has(identifier)) {
              uniqueUsers.set(identifier, {
                id: key, // Use presence key as ID
                socketId: presence.socketId || key, // Map socketId
                userType: presence.userType || 'worker',
                name: presence.name,
                lastName: presence.lastName,
                connectedAt: presence.connectedAt || new Date().toISOString(),
                lastActivity: presence.lastActivity || new Date().toISOString()
              })
            }
          })
        })
        
        const users = Array.from(uniqueUsers.values())
        console.log('Supabase Presence Sync (Deduplicated):', users)
        setConnectedUsers(users)
      })
      .on('broadcast', { event: 'kick-user' }, (payload) => {
        const currentInfo = userInfoRef.current
        const currentType = userTypeRef.current

        // Check if I am the target (by Identity OR by Session ID)
        const isIdentityMatch = 
            payload.targetName && 
            payload.targetName === currentInfo?.name &&
            payload.targetLastName && 
            payload.targetLastName === currentInfo?.lastName &&
            payload.targetUserType === currentType;
            
        const isIdMatch = payload.targetId === sessionId;

        if (isIdentityMatch || isIdMatch) {
           console.warn('You have been kicked!')
           localStorage.removeItem('user_type')
           localStorage.removeItem('user_info')
           window.location.reload()
        }
      })
      .on('broadcast', { event: 'remove-admin' }, (payload) => {
         const currentInfo = userInfoRef.current
         
         const isIdentityMatch = 
            payload.targetName && 
            payload.targetName === currentInfo?.name &&
            payload.targetLastName && 
            payload.targetLastName === currentInfo?.lastName;
            
         const isIdMatch = payload.targetId === sessionId;

         if (isIdentityMatch || isIdMatch) {
             console.warn('Admin privileges removed!')
             localStorage.removeItem('user_type')
             localStorage.removeItem('user_info')
             window.location.reload()
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('Product change detected, reloading...')
        loadDataFromAPI()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        console.log('Settings change detected, reloading...')
        loadDataFromAPI()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to Supabase Realtime')
          setIsConnected(true)
          
          // Track user presence ONLY if we have valid credentials
          if (userInfo?.name && userInfo?.lastName) {
            const presenceData = {
              socketId: sessionId,
              userType,
              name: userInfo.name,
              lastName: userInfo.lastName,
              connectedAt: new Date().toISOString(),
              lastActivity: new Date().toISOString()
            }
            newChannel.track(presenceData)
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('Disconnected from Supabase Realtime:', status)
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    // Internal listeners registry for MockSocket
    const listeners: Record<string, Function[]> = {}

    // Create Mock Socket for backward compatibility
    const mockSocket: MockSocket = {
      id: sessionId,
      connected: true,
      emit: async (event: string, payload?: any) => {
        console.log('Mock Socket Emit:', event, payload)
        if (event === 'identify-user') {
          // Re-track with updated info if provided
          if (payload?.name && payload?.lastName) {
            newChannel.track({
              socketId: sessionId,
              userType: payload?.userType || userType,
              name: payload.name,
              lastName: payload.lastName,
              connectedAt: new Date().toISOString(),
              lastActivity: new Date().toISOString()
            })
          }
        }
        
        if (event === 'kick-user') {
            const msgPayload = typeof payload === 'string' ? { targetId: payload } : payload
            await newChannel.send({
                type: 'broadcast',
                event: 'kick-user',
                payload: msgPayload
            })
            listeners['kick-success']?.forEach(cb => cb('Usuario expulsado correctamente'))
        }

        if (event === 'remove-admin') {
            const msgPayload = typeof payload === 'string' ? { targetId: payload } : payload
            await newChannel.send({
                type: 'broadcast',
                event: 'remove-admin',
                payload: msgPayload
            })
            listeners['remove-admin-success']?.forEach(cb => cb('Administrador removido correctamente'))
        }

        // 'request-user-list' is handled automatically by presence sync
      },
      on: (event: string, cb: any) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      },
      off: (event: string, cb?: any) => {
         if (listeners[event]) {
             if (cb) {
                 listeners[event] = listeners[event].filter(l => l !== cb)
             } else {
                 delete listeners[event]
             }
         }
      },
      close: () => {
        supabase.removeChannel(newChannel)
      }
    }
    
    setSocket(mockSocket)

    return () => {
      supabase.removeChannel(newChannel)
      setSocket(null)
    }
  }, []) // Empty dependency array to run once on mount

  // Effect to update presence when user info changes
  useEffect(() => {
    if (channel && isConnected && userInfo?.name && userInfo?.lastName) {
       // Update presence track with new info
       const sessionId = socket?.id || 'unknown'
       channel.track({
        socketId: sessionId,
        userType,
        name: userInfo.name,
        lastName: userInfo.lastName,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      })
    }
  }, [userType, userInfo?.name, userInfo?.lastName, isConnected, channel])

  const updateData = useCallback((type: 'products' | 'settings', newData: any) => {
    setData(prevData => ({
      ...prevData,
      [type]: newData
    }))
  }, [])

  return {
    socket,
    data,
    connectedUsers,
    isConnected,
    updateData
  }
}