import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import { Product } from '@/types/product';

const LABELS_PER_ROW = 3;
const LABELS_PER_COLUMN = 8;
const LABELS_PER_PAGE = LABELS_PER_ROW * LABELS_PER_COLUMN;

// A4 dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Label dimensions in mm (70mm x 36mm)
const LABEL_WIDTH = 70;
const LABEL_HEIGHT = 36;

// Margins and spacing
const MARGIN_X = (PAGE_WIDTH - (LABELS_PER_ROW * LABEL_WIDTH)) / 2;
const MARGIN_Y = (PAGE_HEIGHT - (LABELS_PER_COLUMN * LABEL_HEIGHT)) / 2;

export const generatePDF = async (products: Product[], imageCache: Map<string, HTMLImageElement>): Promise<void> => {
  const pdf = new jsPDF();
  const totalPages = Math.ceil(products.length / LABELS_PER_PAGE);
  
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }
    
    const startIndex = page * LABELS_PER_PAGE;
    const endIndex = Math.min(startIndex + LABELS_PER_PAGE, products.length);
    const pageProducts = products.slice(startIndex, endIndex);
    
    for (let i = 0; i < pageProducts.length; i++) {
      const product = pageProducts[i];
      const row = Math.floor(i / LABELS_PER_ROW);
      const col = i % LABELS_PER_ROW;
      
      const x = MARGIN_X + (col * LABEL_WIDTH);
      const y = MARGIN_Y + (row * LABEL_HEIGHT);
      
      await drawLabelToPDF(pdf, product, x, y, imageCache);
    }
  }
  
  pdf.save('price-labels.pdf');
};

const drawLabelToPDF = async (
  pdf: jsPDF,
  product: Product,
  x: number,
  y: number,
  imageCache: Map<string, HTMLImageElement>
): Promise<void> => {
  // Label border
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.1);
  pdf.rect(x, y, LABEL_WIDTH, LABEL_HEIGHT);
  
  const padding = 2;
  const contentX = x + padding;
  const contentY = y + padding;
  const contentWidth = LABEL_WIDTH - (padding * 2);
  const contentHeight = LABEL_HEIGHT - (padding * 2);
  
  // Product image
  const imageSize = 15;
  const productImage = imageCache.get(product.reference);
  
  if (productImage) {
    try {
      // Convert image to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = imageSize * 3; // Higher resolution
        canvas.height = imageSize * 3;
        
        const aspectRatio = productImage.width / productImage.height;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        
        if (aspectRatio > 1) {
          drawHeight = canvas.width / aspectRatio;
        } else {
          drawWidth = canvas.height * aspectRatio;
        }
        
        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(productImage, offsetX, offsetY, drawWidth, drawHeight);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        pdf.addImage(imageData, 'JPEG', contentX, contentY, imageSize, imageSize);
      }
    } catch (error) {
      console.error('Error adding product image to PDF:', error);
      drawPlaceholderImage(pdf, contentX, contentY, imageSize);
    }
  } else {
    drawPlaceholderImage(pdf, contentX, contentY, imageSize);
  }
  
  // Text content area
  const textStartX = contentX + imageSize + 2;
  const textWidth = contentWidth - imageSize - 2;
  
  // Product designation
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  
  const maxDesignationWidth = textWidth - 15; // Leave space for price
  let designation = product.designation;
  
  // Truncate designation if too long
  const designationWidth = pdf.getTextWidth(designation);
  if (designationWidth > maxDesignationWidth) {
    while (pdf.getTextWidth(designation + '...') > maxDesignationWidth && designation.length > 0) {
      designation = designation.slice(0, -1);
    }
    designation += '...';
  }
  
  pdf.text(designation, textStartX, contentY + 4);
  
  // Reference
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Ref: ${product.reference}`, textStartX, contentY + 8);
  
  // Price
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  const priceText = `${product.prix.toFixed(2)} €`;
  const priceWidth = pdf.getTextWidth(priceText);
  pdf.text(priceText, x + LABEL_WIDTH - padding - priceWidth, contentY + 4);
  
  // Quantity (if > 1)
  if (product.qte > 1) {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const qtyText = `Qté: ${product.qte}`;
    const qtyWidth = pdf.getTextWidth(qtyText);
    pdf.text(qtyText, x + LABEL_WIDTH - padding - qtyWidth, contentY + 8);
  }
  
  // Barcode
  try {
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, product.codebar, {
      format: "CODE128",
      width: 1,
      height: 30,
      displayValue: false,
    });
    
    const barcodeData = barcodeCanvas.toDataURL('image/png');
    const barcodeWidth = contentWidth - 4;
    const barcodeHeight = 6;
    const barcodeY = y + LABEL_HEIGHT - padding - barcodeHeight - 2;
    
    pdf.addImage(barcodeData, 'PNG', contentX + 2, barcodeY, barcodeWidth, barcodeHeight);
    
    // Barcode text
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const codeWidth = pdf.getTextWidth(product.codebar);
    pdf.text(product.codebar, x + (LABEL_WIDTH - codeWidth) / 2, y + LABEL_HEIGHT - 1);
    
  } catch (error) {
    console.error('Error generating barcode for PDF:', error);
  }
};

const drawPlaceholderImage = (pdf: jsPDF, x: number, y: number, size: number): void => {
  // Draw placeholder rectangle
  pdf.setFillColor(243, 244, 246);
  pdf.rect(x, y, size, size, 'F');
  
  // Add "No Image" text
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  const text = 'No Image';
  const textWidth = pdf.getTextWidth(text);
  pdf.text(text, x + (size - textWidth) / 2, y + size / 2);
};