'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import { useModal } from '@/context/ModalContext'


interface PdfImportExportProps {
  products: any[]
  activeTab: string
  onImport?: (products: any[]) => void
}

export default function PdfImportExport({ products, activeTab, onImport }: PdfImportExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { showAlert } = useModal()

  // Exportar a PDF
  const exportToPdf = async () => {
    setIsExporting(true)
    try {
      const pdf = new jsPDF('l', 'mm', 'a4') // landscape, milímetros, A4
      
      // Título
      pdf.setFontSize(18)
      pdf.text(`Lista de Precios - ${activeTab === 'cauchos' ? 'Cauchos' : 'Baterías'}`, 20, 20)
      
      // Fecha
      pdf.setFontSize(10)
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, 20, 30)
      
      // Tabla de productos
      let yPosition = 45
      pdf.setFontSize(8)
      
      // Encabezados
      const headers = ['Producto', 'Medida', 'Lista $', 'Lista $', 'Cashea %', 'Transferencia %', 'Divisas %', 'Otro %']
      const colWidths = [40, 35, 25, 25, 20, 25, 20, 20]
      let xPosition = 20
      
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition)
        xPosition += colWidths[index]
      })
      
      yPosition += 10
      
      // Línea separadora
      pdf.line(20, yPosition - 2, 270, yPosition - 2)
      yPosition += 5
      
      // Datos de productos
      products.forEach((product, index) => {
        if (yPosition > 180) {
          pdf.addPage()
          yPosition = 20
        }
        
        xPosition = 20
        const row = [
          product.type,
          product.medida,
          product.precioListaBs.toFixed(2),
          product.precioListaUsd.toFixed(2),
          `${product.adjustmentCashea || 0}%`,
          `${product.adjustmentTransferencia || 0}%`,
          `${product.adjustmentDivisas || 0}%`,
          `${product.adjustmentCustom || 0}%`
        ]
        
        row.forEach((cell, cellIndex) => {
          pdf.text(cell.toString(), xPosition, yPosition)
          xPosition += colWidths[cellIndex]
        })
        
        yPosition += 8
      })
      
      // Guardar PDF
      pdf.save(`lista_precios_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Error exporting PDF:', error)
      showAlert('Error al exportar PDF', 'Error')
    } finally {
      setIsExporting(false)
    }
  }

  // Importar desde PDF con OCR fallback
  const importFromPdf = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsImporting(true)
      try {
        // Dinamically import libraries to avoid SSR issues
        const [pdfjsLib, { createWorker }] = await Promise.all([
          import('pdfjs-dist'),
          import('tesseract.js')
        ])
        
        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        let isScanned = false

        // 1. Intentar extracción de texto digital
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map((item: any) => item.str).join(' ')
          fullText += pageText + '\n'
        }

        // 2. Si hay muy poco texto, es probable que sea escaneado -> OCR
        if (fullText.trim().length < 100) {
          isScanned = true
          showAlert('El PDF parece ser un escaneo. Iniciando OCR (Reconocimiento de caracteres)...', 'Información')
          
          fullText = ''
          const worker = await createWorker('spa')
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 2.0 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.height = viewport.height
            canvas.width = viewport.width
            
            if (context) {
              await page.render({ canvasContext: context, viewport } as any).promise
              const { data: { text } } = await worker.recognize(canvas)
              fullText += text + '\n'
            }
          }
          await worker.terminate()
        }

        // 3. Procesar el texto extraído (Lógica similar a ExcelImport)
        const lines = fullText.split('\n')
        const extractedProducts: any[] = []
        const foundMatches = new Set()

        lines.forEach(line => {
          if (line.trim().length < 5) return

          // Heurística de detección: Marca/Tipo + Medida + Precio
          
          // 1. Buscar medida: 000/00R00
          const sizeMatch = line.match(/(\d{2,3})[\s\.\/-]*(\d{2})[\s\.\/-]*[RrDd]?[\s\.\/-]*(\d{2})/)
          if (!sizeMatch) return

          const medida = `${sizeMatch[1]}/${sizeMatch[2]}R${sizeMatch[3]}`.toUpperCase()
          
          // 2. Buscar precio después de la medida
          const afterSize = line.split(sizeMatch[0])[1] || ''
          
          // Regex mejorado para precios: soporta 1.234,56 o 1,234.56
          // Busca números que pueden tener separadores, seguidos opcionalmente por moneda
          // Asegura que termine en dígito para evitar capturar puntos finales de oración
          const priceMatch = afterSize.match(/(?:Bs\.?|USD|\$)?\s*([\d.,]*\d)\s*(?:Bs\.?|USD|\$)?/i)
          
          if (priceMatch) {
            // Limpiar el precio: eliminar todo excepto dígitos y el último separador decimal
            let priceStr = priceMatch[1]
            
            // Si tiene coma y punto, asumir que el último es el decimal
            if (priceStr.includes(',') && priceStr.includes('.')) {
               // Normalizar a formato 1234.56
               priceStr = priceStr.replace(/[,.](?=\d{3}(?=[,.]))/g, '') // Quitar separadores de miles
                                  .replace(',', '.') // Cambiar coma decimal a punto
            } else if (priceStr.includes(',')) {
               // Si solo tiene comas:
               // Si hay más de una coma o la coma está seguida de 3 dígitos -> miles
               // Si está al final -> decimal
               // Asumiremos formato europeo 1.234,56 si hay puntos, pero aquí solo hay comas
               // Caso común en Venezuela: 1,234.56 o 1.234,56
               
               // Estrategia simple: reemplazar coma por punto
               priceStr = priceStr.replace(',', '.')
            }
            // Eliminar cualquier otro caracter no numérico excepto el punto
            priceStr = priceStr.replace(/[^\d.]/g, '')
            
            // Validar que no haya múltiples puntos
            const parts = priceStr.split('.')
            if (parts.length > 2) {
               // Mantener solo el último punto
               priceStr = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
            }

            const precio = parseFloat(priceStr)
            if (isNaN(precio) || precio <= 0) return

            // 3. Obtener la marca (texto antes de la medida)
            let type = line.split(sizeMatch[0])[0].trim()
            if (!type) {
              const words = line.match(/[A-ZÁÉÍÓÚÑ]{2,}/g)
              type = words ? words[0] : 'Sin marca'
            }

            // Limpieza básica
            type = type.replace(/^(Cauchos?|Llanta|Neumático|Batería|Battery)\s*[-:]?\s*/gi, '')
            type = type.replace(/\s+/g, ' ').trim()

            const key = `${medida}-${type}-${precio}`
            if (!foundMatches.has(key)) {
              foundMatches.add(key)
              extractedProducts.push({
                type: type || 'Sin marca',
                medida: medida,
                precio: precio,
                selected: true
              })
            }
          }
        })

        if (extractedProducts.length > 0) {
          if (onImport) onImport(extractedProducts)
          showAlert(`${extractedProducts.length} productos detectados ${isScanned ? '(vía OCR)' : '(vía Texto Digital)'}`, 'Éxito')
        } else {
          showAlert('No se pudieron detectar productos con formato válido en el PDF.', 'Advertencia')
        }
        
      } catch (error) {
        console.error('Error importing PDF:', error)
        showAlert('Error al procesar el archivo PDF. Asegúrate de que no esté protegido por contraseña.', 'Error')
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={importFromPdf}
        disabled={isImporting}
        className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-amber-500/20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isImporting ? 'Importando...' : 'Importar PDF'}
      </button>
      
      <button
        onClick={exportToPdf}
        disabled={isExporting || products.length === 0}
        className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-amber-500/20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exportando...' : 'Exportar PDF'}
      </button>
    </div>
  )
}