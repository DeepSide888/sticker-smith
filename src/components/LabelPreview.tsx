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

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Point 50 logo/branding (top left)
    ctx.fillStyle = '#f97316'; // Orange color
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('POINT', 8, 18);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('50', 8, 35);

    // Reference (top right)
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Ref:', width - 40, 15);
    ctx.font = 'bold 10px Arial';
    ctx.fillText(currentProduct.reference, width - 8, 15);

    // Codebar (under reference)
    ctx.fillStyle = '#000000';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(currentProduct.codebar, width - 8, 28);

    // Product designation (center, larger)
    ctx.fillStyle = '#000000';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    
    let designation = currentProduct.designation;
    const maxWidth = width - 20;
    
    // Truncate if too long
    if (ctx.measureText(designation).width > maxWidth) {
      while (ctx.measureText(designation + '...').width > maxWidth && designation.length > 0) {
        designation = designation.slice(0, -1);
      }
      designation += '...';
    }
    
    ctx.fillText(designation, width / 2, 55);

    // Large price number (center, prominent)
    ctx.fillStyle = '#f97316'; // Orange color
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    
    // Extract just the number part for large display
    const priceNumber = Math.floor(currentProduct.prix).toString();
    ctx.fillText(priceNumber, width / 2 - 20, 105);

    // Euro symbol
    ctx.font = 'bold 32px Arial';
    ctx.fillText('€', width / 2 + 30, 105);

    // Decimal part (if not whole number)
    if (currentProduct.prix % 1 !== 0) {
      const decimal = (currentProduct.prix % 1).toFixed(2).substring(1);
      ctx.font = 'bold 16px Arial';
      ctx.fillText(decimal, width / 2 + 50, 90);
    }

    // Quantity indicator (if > 1)
    if (currentProduct.qte > 1) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Qté: ${currentProduct.qte}`, 8, height - 8);
    }
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