'use client'

import { memo } from 'react'

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
  adjustmentPagoMovil?: number
  createdAt: string
  updatedAt: string
}

interface MobileProductCardProps {
  product: Product
  isAdmin: boolean
  calculatePrice: (basePrice: number, adjustment: number, currency?: 'bs' | 'usd', applyTax?: boolean) => number
  openEditModal: (product: Product) => void
  openDeleteModal: (product: Product) => void
  currentDefaults: { [key: string]: number }
  currentGlobals: { [key: string]: number }
  priceColumns: { key: string, label: string, base?: 'bs' | 'usd', applyTax?: boolean }[]
  tempGlobalDiscounts?: { bs: number, usd: number }
  taxRate?: number
  exchangeRate?: number
  viewCurrency?: 'bs' | 'usd'
}

const MobileProductCard = memo(function MobileProductCard({
  product,
  isAdmin,
  calculatePrice,
  openEditModal,
  openDeleteModal,
  currentDefaults,
  currentGlobals,
  priceColumns,
  tempGlobalDiscounts = { bs: 0, usd: 0 },
  taxRate = 16,
  exchangeRate = 60,
  viewCurrency = 'bs'
}: MobileProductCardProps) {
  const getEffectiveAdjustment = (type: string) => {
    const individualKey = `adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`
    const individualAdjustment = (product as any)[individualKey]
    
    if (individualAdjustment !== undefined && individualAdjustment !== null && individualAdjustment !== '') {
      return parseFloat(individualAdjustment)
    }
    
    return currentGlobals?.[type] || currentDefaults?.[type] || 0
  }

  const getDisplayedBasePrice = (currency: 'bs' | 'usd') => {
    const base = currency === 'bs' ? product.precioListaBs : product.precioListaUsd
    const discount = tempGlobalDiscounts[currency]
    if (!discount || discount === 0) return Math.max(0, base)
    const factor = 1 + (discount / 100)
    const val = base * factor
    return Math.max(0, Math.round(val * 100) / 100)
  }

  return (
    <div className="card-glass rounded-xl p-3 mb-3 border border-white/10 hover:bg-white/5 transition-all">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <h3 className="text-lg font-bold font-mono text-red-500 truncate">{product.medida}</h3>
          <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">{product.type}</span>
        </div>
        
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button 
              onClick={() => openEditModal(product)}
              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={() => openDeleteModal(product)}
              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="hidden gap-3 mt-1 text-sm text-gray-500 font-mono">
        <span>L($): <span className="text-gray-300">${getDisplayedBasePrice('usd').toFixed(2)}</span></span>
        <span>L(Bs): <span className="text-gray-300">${getDisplayedBasePrice('bs').toFixed(2)}</span></span>
      </div>

      {/* Prices Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {(priceColumns || []).map(({ key: type, label, base, applyTax }) => {
          const adjustment = getEffectiveAdjustment(type)
          const nativeCurrency = base || 'usd'
          const isNativeUsd = nativeCurrency === 'usd'
          
          // FIX: Always use the price from the list (which includes global adjustments) as the base
          const nativeBasePrice = isNativeUsd ? getDisplayedBasePrice('usd') : getDisplayedBasePrice('bs')
          const shouldApplyTax = applyTax !== undefined ? applyTax : (nativeCurrency === 'bs')
          const nativeFinalPrice = Math.max(0, calculatePrice(nativeBasePrice, adjustment, nativeCurrency, shouldApplyTax))
          const nativeTaxAmount = shouldApplyTax ? nativeBasePrice * (taxRate / 100) : 0
          
          // Conversion Logic REMOVED to respect native column currency
          let displayBasePrice = nativeBasePrice
          let displayFinalPrice = nativeFinalPrice
          let displayTaxAmount = nativeTaxAmount

          /* 
             Eliminamos conversión para que:
             - Columnas en Bs se muestren en Bs (con símbolo $)
             - Columnas en USD se muestren en USD (con símbolo $)
          */

          const defaultAdj = currentDefaults?.[type] || 0
          const isIndividual = Math.abs(adjustment - defaultAdj) > 0.01
          
          return (
            <div key={type} className="bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wide truncate pr-1" title={label}>{label}</span>
                <div className={`flex items-center ${adjustment < 0 ? 'text-red-400' : adjustment > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span className="text-[9px] font-bold">
                    {(adjustment >= 0 ? '+' : '')}{adjustment}%
                  </span>
                  {isIndividual && <span className="text-amber-400 text-[8px] ml-0.5" title="Ajuste individual">●</span>}
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="flex justify-between items-end">
                  <div className="text-[9px] text-gray-500 font-medium">
                    {nativeCurrency === 'bs' ? 'L(Bs)' : 'L($)'} ${nativeBasePrice.toFixed(2)}
                  </div>
                  <div className="text-sm font-bold font-mono text-white leading-none">
                    ${nativeFinalPrice.toFixed(2)}
                  </div>
                </div>
                {shouldApplyTax && (
                   <div className="text-[8px] text-gray-500 text-right mt-0.5">
                     +IVA
                   </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default MobileProductCard
