'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PdfImportExportProps {
  products: any[]
  activeTab: string
  onImport?: (products: any[]) => void
}

export default function PdfImportExport({ products, activeTab, onImport }: PdfImportExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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
      const headers = ['Producto', 'Medida', 'Lista Bs', 'Lista $', 'Cashea %', 'Transferencia %', 'Divisas %', 'Otro %']
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
      alert('Error al exportar PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Importar desde PDF (simulado - en realidad sería OCR)
  const importFromPdf = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsImporting(true)
      try {
        // Nota: Importar desde PDF requiere OCR que es complejo
        // Por ahora, mostramos un mensaje explicativo
        alert('Para importar desde PDF, se requiere un servicio de OCR.\nPor ahora, puedes usar la importación desde Excel que es más precisa.')
        
        // Si quisieras implementar OCR, podrías usar servicios como:
        // - Google Cloud Vision API
        // - AWS Textract
        // - Tesseract.js (cliente)
        
      } catch (error) {
        console.error('Error importing PDF:', error)
        alert('Error al importar PDF')
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
        className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isImporting ? 'Importando...' : 'Importar PDF'}
      </button>
      
      <button
        onClick={exportToPdf}
        disabled={isExporting || products.length === 0}
        className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exportando...' : 'Exportar PDF'}
      </button>
    </div>
  )
}