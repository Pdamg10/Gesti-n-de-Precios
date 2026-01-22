'use client'

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

interface MobileProductCardProps {
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

export default function MobileProductCard({
  product,
  isAdmin,
  getEffectiveAdjustment,
  calculatePrice,
  openEditModal,
  openDeleteModal,
  currentDefaults,
  priceColumns,
  tempGlobalDiscounts = { bs: 0, usd: 0 }
}: MobileProductCardProps) {
  const getDisplayedBasePrice = (currency: 'bs' | 'usd') => {
    const base = currency === 'bs' ? product.precioListaBs : product.precioListaUsd
    const discount = tempGlobalDiscounts[currency]
    if (!discount || discount === 0) return base
    const factor = 1 + (discount / 100)
    const val = base * factor
    return Math.round(val * 100) / 100
  }

  return (
    <div className="card-glass rounded-xl p-3 mb-3 border border-white/10 hover:bg-white/5 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold font-mono text-amber-400">{product.medida}</h3>
            <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{product.type}</span>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-gray-500 font-mono">
            <span>L($): <span className="text-gray-300">${getDisplayedBasePrice('usd').toFixed(2)}</span></span>
            <span>L(Bs): <span className="text-gray-300">Bs{getDisplayedBasePrice('bs').toFixed(2)}</span></span>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex gap-1">
            <button 
              onClick={() => openEditModal(product)}
              className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={() => openDeleteModal(product)}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Prices Grid */}
      <div className="grid grid-cols-2 gap-2">
        {(priceColumns || []).map(({ key: type, label }) => {
          const adjustment = getEffectiveAdjustment(product, type)
          
          const isUsd = type === 'divisas' || type === 'custom' || type === 'pagoMovil' || type === 'cashea' || type === 'transferencia' || true
          const basePrice = isUsd ? getDisplayedBasePrice('usd') : getDisplayedBasePrice('bs')
          
          const finalPrice = calculatePrice(basePrice, adjustment)
          
          // Determine if individual or global based on value comparison
          const defaultAdj = currentDefaults?.[type] || 0
          const isIndividual = Math.abs(adjustment - defaultAdj) > 0.01

          return (
            <div key={type} className="bg-black/20 rounded-lg p-1.5 border border-white/5 flex flex-col justify-center min-h-[50px]">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-gray-300 text-[9px] font-bold uppercase tracking-wide truncate pr-1 leading-none" title={label}>{label}</span>
                <div className={`flex items-center gap-0.5 ${adjustment < 0 ? 'text-red-400' : adjustment > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  <span className={`text-[8px] font-bold px-1 py-0 rounded-full leading-none ${
                    adjustment < 0 
                      ? 'bg-red-500/10 border border-red-500/30' 
                      : adjustment > 0 
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-gray-500/10 border border-gray-500/30'
                  }`}>
                    {(adjustment >= 0 ? '+' : '')}{adjustment}%
                  </span>
                  {isIndividual && <span className="text-amber-400 text-[8px] leading-none" title="Ajuste individual">●</span>}
                </div>
              </div>
              
              <div className="flex items-baseline justify-between w-full">
                <div className="text-[8px] text-gray-400 font-medium leading-none">
                  Base: {isUsd ? '$' : 'Bs'}{basePrice.toFixed(2)}
                </div>
                <div className="text-sm font-bold font-mono text-white leading-none">
                  {isUsd ? '$' : 'Bs'}{finalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
