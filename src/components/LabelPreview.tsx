import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "@/types/product";
import JsBarcode from "jsbarcode";
import { Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface LabelPreviewProps {
  products: Product[];
  onGeneratePDF: () => void;
  isGenerating?: boolean;
}

export const LabelPreview = ({ products, onGeneratePDF, isGenerating }: LabelPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map());

  const currentProduct = products[currentIndex];

  const generateBarcode = (code: string): string => {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, code, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false,
      });
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating barcode:', error);
      return '';
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawLabel = async () => {
    if (!canvasRef.current || !currentProduct) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Label dimensions (A4 compatible: 70mm x 36mm at 300dpi)
    const width = 264; // ~70mm at 96dpi
    const height = 136; // ~36mm at 96dpi
    
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Product image
    let productImage: HTMLImageElement | null = null;
    if (currentProduct.image) {
      try {
        if (imageCache.has(currentProduct.reference)) {
          productImage = imageCache.get(currentProduct.reference)!;
        } else {
          productImage = await loadImage(currentProduct.image);
          setImageCache(prev => new Map(prev).set(currentProduct.reference, productImage!));
        }
      } catch (error) {
        console.error('Error loading product image:', error);
      }
    }

    if (productImage) {
      const imgSize = 60;
      const imgX = 8;
      const imgY = 8;
      
      // Calculate aspect ratio
      const aspectRatio = productImage.width / productImage.height;
      let drawWidth = imgSize;
      let drawHeight = imgSize;
      
      if (aspectRatio > 1) {
        drawHeight = imgSize / aspectRatio;
      } else {
        drawWidth = imgSize * aspectRatio;
      }
      
      ctx.drawImage(productImage, imgX, imgY, drawWidth, drawHeight);
    } else {
      // Placeholder for missing image
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(8, 8, 60, 60);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No Image', 38, 38);
    }

    // Product designation (main text)
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    
    const maxDesignationWidth = width - 85;
    let designation = currentProduct.designation;
    
    // Truncate if too long
    if (ctx.measureText(designation).width > maxDesignationWidth) {
      while (ctx.measureText(designation + '...').width > maxDesignationWidth && designation.length > 0) {
        designation = designation.slice(0, -1);
      }
      designation += '...';
    }
    
    ctx.fillText(designation, 76, 25);

    // Reference
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    ctx.fillText(`Ref: ${currentProduct.reference}`, 76, 40);

    // Price (large, prominent)
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${currentProduct.prix.toFixed(2)} €`, width - 10, 25);

    // Quantity (if > 1)
    if (currentProduct.qte > 1) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.fillText(`Qté: ${currentProduct.qte}`, width - 10, 40);
    }

    // Barcode at bottom
    const barcodeDataUrl = generateBarcode(currentProduct.codebar);
    if (barcodeDataUrl) {
      try {
        const barcodeImg = await loadImage(barcodeDataUrl);
        const barcodeWidth = width - 16;
        const barcodeHeight = 25;
        ctx.drawImage(barcodeImg, 8, height - barcodeHeight - 8, barcodeWidth, barcodeHeight);
      } catch (error) {
        console.error('Error drawing barcode:', error);
      }
    }

    // Codebar text
    ctx.fillStyle = '#374151';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentProduct.codebar, width / 2, height - 2);
  };

  useEffect(() => {
    drawLabel();
  }, [currentProduct, imageCache]);

  const nextLabel = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevLabel = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Label Preview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Preview label {currentIndex + 1} of {products.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center bg-gray-50 p-4 rounded-lg">
          <canvas
            ref={canvasRef}
            className="border border-gray-200 shadow-sm"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={prevLabel}
            disabled={products.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentProduct?.designation}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextLabel}
            disabled={products.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={onGeneratePDF}
          disabled={isGenerating}
          className="w-full"
          variant="hero"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating PDF..." : "Download All Labels as PDF"}
        </Button>
      </CardContent>
    </Card>
  );
};