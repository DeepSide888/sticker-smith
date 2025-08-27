import jsPDF from 'jspdf';
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
  
  // Point 50 logo/branding (top left)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(249, 115, 22); // Orange color
  pdf.text('POINT', contentX, contentY + 6);
  pdf.setFontSize(12);
  pdf.text('50', contentX, contentY + 12);

  // Product image (bottom right)
  const imageSize = 10;
  const imageX = x + LABEL_WIDTH - padding - imageSize;
  const imageY = y + LABEL_HEIGHT - padding - imageSize;
  const productImage = imageCache.get(product.reference);

  if (productImage) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = imageSize * 3;
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

        pdf.addImage(imageData, 'JPEG', imageX, imageY, imageSize, imageSize);
      }
    } catch (error) {
      console.error('Error adding product image to PDF:', error);
      drawPlaceholderImage(pdf, imageX, imageY, imageSize);
    }
  } else {
    drawPlaceholderImage(pdf, imageX, imageY, imageSize);
  }
  
  // Reference (top right)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const refText = 'Ref:';
  pdf.text(refText, x + LABEL_WIDTH - padding - 15, contentY + 4);

  pdf.setFont('helvetica', 'bold');
  pdf.text(product.reference, x + LABEL_WIDTH - padding, contentY + 4);

  // Barcode (under reference)
  try {
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, product.codebar, {
      format: 'CODE128',
      width: 1,
      height: 40,
      displayValue: false,
    });

    const barcodeData = barcodeCanvas.toDataURL('image/png');
    const barcodeWidth = 30;
    const barcodeHeight = 6;
    const barcodeX = x + LABEL_WIDTH - padding - barcodeWidth;
    const barcodeY = contentY + 4;

    pdf.addImage(barcodeData, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const codeWidth = pdf.getTextWidth(product.codebar);
    pdf.text(product.codebar, barcodeX + (barcodeWidth - codeWidth) / 2, barcodeY + barcodeHeight + 3);
  } catch (error) {
    console.error('Error generating barcode for PDF:', error);
  }
  
  // Product designation (center)
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  let designation = product.designation;
  const maxDesignationWidth = contentWidth - 4;
  
  // Truncate designation if too long
  const designationWidth = pdf.getTextWidth(designation);
  if (designationWidth > maxDesignationWidth) {
    while (pdf.getTextWidth(designation + '...') > maxDesignationWidth && designation.length > 0) {
      designation = designation.slice(0, -1);
    }
    designation += '...';
  }
  
  const designationX = x + (LABEL_WIDTH - pdf.getTextWidth(designation)) / 2;
  pdf.text(designation, designationX, contentY + 18);
  
  // Large price number (center, prominent)
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(249, 115, 22); // Orange color
  
  // Extract just the number part for large display
  const priceNumber = Math.floor(product.prix).toString();
  const priceNumberWidth = pdf.getTextWidth(priceNumber);
  
  // Euro symbol
  pdf.setFontSize(24);
  const euroWidth = pdf.getTextWidth('€');
  
  // Calculate total width for centering
  const totalPriceWidth = priceNumberWidth + euroWidth + 2;
  const priceStartX = x + (LABEL_WIDTH - totalPriceWidth) / 2;
  
  // Draw price number
  pdf.setFontSize(32);
  pdf.text(priceNumber, priceStartX, contentY + 30);
  
  // Draw euro symbol
  pdf.setFontSize(24);
  pdf.text('€', priceStartX + priceNumberWidth + 2, contentY + 30);
  
  // Decimal part (if not whole number)
  if (product.prix % 1 !== 0) {
    const decimal = (product.prix % 1).toFixed(2).substring(1);
    pdf.setFontSize(12);
    pdf.text(decimal, priceStartX + priceNumberWidth + euroWidth + 4, contentY + 26);
  }
  
  // Quantity indicator (if > 1)
  if (product.qte > 1) {
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Qté: ${product.qte}`, contentX, y + LABEL_HEIGHT - 2);
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
