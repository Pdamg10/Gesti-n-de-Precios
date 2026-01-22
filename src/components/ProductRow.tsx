'use client'

import { roundToNearest5 } from '@/lib/utils'

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

interface ProductRowProps {
  product: Product
  isAdmin: boolean
  getEffectiveAdjustment: (product: Product, type: string) => number
  calculatePrice: (basePrice: number, adjustment: number) => number
  openEditModal: (product: Product) => void
  openDeleteModal: (product: Product) => void
  currentDefaults: { [key: string]: number }
  priceColumns: { key: string, label: string }[]
  tempGlobalDiscounts?: { bs: number, usd: number }
}

export default function ProductRow({
  product,
  isAdmin,
  getEffectiveAdjustment,
  calculatePrice,
  openEditModal,
  openDeleteModal,
  currentDefaults,
  priceColumns,
  tempGlobalDiscounts = { bs: 0, usd: 0 }
}: ProductRowProps) {
  const getDisplayedBasePrice = (currency: 'bs' | 'usd') => {
    const base = currency === 'bs' ? product.precioListaBs : product.precioListaUsd
    const discount = tempGlobalDiscounts[currency]
    if (!discount || discount === 0) return base
    const factor = 1 + (discount / 100)
    const val = base * factor
    return Math.round(val * 100) / 100
  }

  return (
    <tr key={product.id} className="border-b border-white/5 hover:bg-white/10 transition-colors">
      <td className="py-3 pr-3">
        <div className="font-mono text-amber-400 font-semibold">{product.medida}</div>
        <div className="text-sm text-gray-400">{product.type}</div>
      </td>
      {(priceColumns || []).map(({ key: type }) => {
        const adjustment = getEffectiveAdjustment(product, type)
        const isUsd = type === 'divisas' || type === 'custom'
        const basePrice = isUsd ? getDisplayedBasePrice('usd') : getDisplayedBasePrice('bs')
        const finalPrice = calculatePrice(basePrice, adjustment)
        
        // Determine if individual or global based on value comparison
        const defaultAdj = currentDefaults?.[type] || 0
        const isIndividual = Math.abs(adjustment - defaultAdj) > 0.01
        
        return (
          <td key={type} className="py-3 px-2 text-right">
            <div className="text-xs text-gray-300 mb-0.5 font-medium">Base: {isUsd ? '$' : '$'}{basePrice.toFixed(2)}</div>
            <div className={`text-lg mb-0.5 font-bold ${adjustment < 0 ? 'text-red-400' : adjustment > 0 ? 'text-green-400' : 'text-gray-400'}`}>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                adjustment < 0 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                  : adjustment > 0 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
              }`}>
                {(adjustment >= 0 ? '+' : '')}{adjustment}%
              </span>
              {isIndividual && <span className="text-amber-400 ml-1" title="Ajuste individual">●</span>}
            </div>
            <div className="font-mono text-xs font-medium text-white">Total: {isUsd ? '$' : '$'}{finalPrice.toFixed(2)}</div>
          </td>
        )
      })}
      <td className="py-3 px-2 text-right font-mono text-sm">${getDisplayedBasePrice('bs').toFixed(2)}</td>
      <td className="py-3 px-2 text-right font-mono text-sm">${getDisplayedBasePrice('usd').toFixed(2)}</td>
      <td className="py-3 pl-2 text-center">
        <div className="flex justify-center gap-1">
          {isAdmin ? (
            <>
              <button
                onClick={() => openEditModal(product)}
                className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-colors"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => openDeleteModal(product)}
                className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <span className="text-gray-500 text-sm">Solo lectura</span>
          )}
        </div>
      </td>
    </tr>
  )
}
