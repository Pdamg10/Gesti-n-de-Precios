'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

type ModalType = 'alert' | 'confirm' | 'prompt'

interface ModalOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ModalType
  defaultValue?: string
  isPassword?: boolean
}

interface ModalContextType {
  showAlert: (message: string, title?: string) => Promise<void>
  showConfirm: (message: string, title?: string) => Promise<boolean>
  showPrompt: (message: string, title?: string, defaultValue?: string, isPassword?: boolean) => Promise<string | null>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ModalOptions>({ message: '' })
  const [inputValue, setInputValue] = useState('')
  
  const resolver = useRef<((value: any) => void) | null>(null)

  const showModal = useCallback((newOptions: ModalOptions) => {
    setOptions(newOptions)
    setInputValue(newOptions.defaultValue || '')
    setIsOpen(true)
    return new Promise<any>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const showAlert = (message: string, title: string = 'Aviso') => 
    showModal({ message, title, type: 'alert', confirmText: 'Aceptar' })

  const showConfirm = (message: string, title: string = 'Confirmar') => 
    showModal({ message, title, type: 'confirm', confirmText: 'Sí', cancelText: 'No' })

  const showPrompt = (message: string, title: string = 'Ingresar datos', defaultValue: string = '', isPassword: boolean = false) => 
    showModal({ message, title, type: 'prompt', confirmText: 'Aceptar', cancelText: 'Cancelar', defaultValue, isPassword })

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolver.current) {
      if (options.type === 'prompt') {
        resolver.current(inputValue)
      } else {
        resolver.current(true)
      }
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolver.current) {
      if (options.type === 'alert') {
        resolver.current(undefined)
      } else {
        resolver.current(options.type === 'confirm' ? false : null)
      }
    }
  }

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
            {options.title && (
              <h3 className="text-xl font-semibold text-red-500 mb-2">{options.title}</h3>
            )}
            <p className="text-gray-200 mb-6 leading-relaxed">{options.message}</p>
            
            {options.type === 'prompt' && (
              <div className="mb-6">
                <input
                  type={options.isPassword ? 'password' : 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm()
                    if (e.key === 'Escape') handleCancel()
                  }}
                  className="w-full input-dark rounded-lg px-4 py-3 text-white border-white/10 focus:border-amber-500/50 transition-all outline-none"
                  placeholder="Escribe aquí..."
                />
              </div>
            )}
            
            <div className="flex gap-3">
              {options.type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all border border-white/5"
                >
                  {options.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="flex-1 btn-primary px-4 py-2.5 rounded-xl font-medium text-gray-900 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {options.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}
