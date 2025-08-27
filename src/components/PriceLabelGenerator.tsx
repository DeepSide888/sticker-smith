import { useState } from "react";
import { FileUpload } from "./FileUpload";
import { ColumnMapper } from "./ColumnMapper";
import { LabelPreview } from "./LabelPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseExcelFile, mapDataToProducts, processImageFiles } from "@/utils/excelParser";
import { generatePDF } from "@/utils/pdfGenerator";
import { Product, ColumnMapping } from "@/types/product";
import { toast } from "sonner";
import { Tag, CheckCircle, AlertCircle } from "lucide-react";

type Step = 'upload' | 'mapping' | 'preview';

export const PriceLabelGenerator = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [excelData, setExcelData] = useState<{ data: any[][], columns: string[] } | null>(null);
  const [imageFiles, setImageFiles] = useState<Map<string, string>>(new Map());
  const [products, setProducts] = useState<Product[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const handleExcelUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const parsedData = await parseExcelFile(file);
      setExcelData(parsedData);
      
      if (imageFiles.size > 0) {
        setCurrentStep('mapping');
      }
      
      toast.success(`Excel file parsed successfully! Found ${parsedData.data.length - 1} products.`);
    } catch (error) {
      toast.error("Error parsing Excel file: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagesUpload = (files: FileList) => {
    const imageMap = processImageFiles(files);
    setImageFiles(imageMap);
    
    if (excelData) {
      setCurrentStep('mapping');
    }
    
    toast.success(`${imageMap.size} product images loaded`);
  };

  const handleMappingComplete = async (mapping: ColumnMapping) => {
    if (!excelData) return;
    
    setIsLoading(true);
    try {
      const mappedProducts = mapDataToProducts(excelData.data, mapping, imageFiles);
      setProducts(mappedProducts);
      setCurrentStep('preview');
      
      toast.success(`Successfully mapped ${mappedProducts.length} products!`);
    } catch (error) {
      toast.error("Error mapping data: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsLoading(true);
    try {
      await generatePDF(products, imageCache);
      toast.success("PDF generated successfully!");
    } catch (error) {
      toast.error("Error generating PDF: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (step: Step) => {
    if (step === 'upload') {
      return excelData && imageFiles.size > 0 ? 'completed' : currentStep === step ? 'current' : 'pending';
    }
    if (step === 'mapping') {
      return products.length > 0 ? 'completed' : currentStep === step ? 'current' : 'pending';
    }
    if (step === 'preview') {
      return currentStep === step ? 'current' : 'pending';
    }
    return 'pending';
  };

  const StepIndicator = ({ step, label, status }: { step: Step; label: string; status: 'pending' | 'current' | 'completed' }) => (
    <div className="flex items-center gap-2">
      {status === 'completed' ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : status === 'current' ? (
        <div className="h-5 w-5 rounded-full bg-primary animate-pulse" />
      ) : (
        <div className="h-5 w-5 rounded-full bg-muted" />
      )}
      <span className={`text-sm font-medium ${status === 'current' ? 'text-primary' : status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {status === 'current' && (
        <Badge variant="outline" className="text-xs">
          Current
        </Badge>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-elegant bg-gradient-primary text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
              <Tag className="h-8 w-8" />
              Price Label Generator
            </CardTitle>
            <p className="text-primary-foreground/90 text-lg">
              Professional label printing solution for your shop
            </p>
          </CardHeader>
        </Card>

        {/* Progress Steps */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex justify-between items-center">
              <StepIndicator step="upload" label="Upload Files" status={getStepStatus('upload')} />
              <div className="flex-1 h-px bg-border mx-4" />
              <StepIndicator step="mapping" label="Map Columns" status={getStepStatus('mapping')} />
              <div className="flex-1 h-px bg-border mx-4" />
              <StepIndicator step="preview" label="Generate Labels" status={getStepStatus('preview')} />
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {currentStep === 'upload' && (
              <FileUpload
                onExcelUpload={handleExcelUpload}
                onImagesUpload={handleImagesUpload}
                isLoading={isLoading}
              />
            )}

            {currentStep === 'mapping' && excelData && (
              <ColumnMapper
                columns={excelData.columns}
                onMappingComplete={handleMappingComplete}
                isLoading={isLoading}
              />
            )}

            {currentStep === 'preview' && products.length > 0 && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Products Ready
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Successfully processed {products.length} products
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {products.filter(p => p.image).length} with images
                      </Badge>
                      <Badge variant="outline">
                        {products.filter(p => !p.image).length} without images
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Cards */}
            {excelData && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-sm">Excel Data</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{excelData.data.length - 1} products found</p>
                  <p>Columns: {excelData.columns.join(", ")}</p>
                </CardContent>
              </Card>
            )}

            {imageFiles.size > 0 && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-sm">Product Images</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{imageFiles.size} images loaded</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview */}
          <div>
            {currentStep === 'preview' && products.length > 0 && (
              <LabelPreview
                products={products}
                onGeneratePDF={handleGeneratePDF}
                isGenerating={isLoading}
              />
            )}
            
            {currentStep !== 'preview' && (
              <Card className="shadow-soft h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Label preview will appear here</p>
                  <p className="text-sm">Complete the steps to generate labels</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};