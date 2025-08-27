import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onExcelUpload: (file: File) => void;
  onImagesUpload: (files: FileList) => void;
  isLoading?: boolean;
}

export const FileUpload = ({ onExcelUpload, onImagesUpload, isLoading }: FileUploadProps) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageCount, setImageCount] = useState<number>(0);

  const handleExcelSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setExcelFile(file);
        onExcelUpload(file);
        toast.success(`Excel file loaded: ${file.name}`);
      } else {
        toast.error("Please select a valid Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleImagesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setImageCount(files.length);
      onImagesUpload(files);
      toast.success(`${files.length} product images loaded`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your Excel file containing product data (CODEBAR, QTE, PRIX, DESIGNATION, REFERENCE)
          </p>
          <Button
            variant="professional"
            onClick={() => excelInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {excelFile ? excelFile.name : "Select Excel File"}
          </Button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelSelect}
            className="hidden"
          />
          {excelFile && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✓ {excelFile.name} loaded
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Product Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload product images named with reference codes (e.g., REF123.jpg)
          </p>
          <Button
            variant="professional"
            onClick={() => imagesInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {imageCount > 0 ? `${imageCount} Images Selected` : "Select Images"}
          </Button>
          <input
            ref={imagesInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesSelect}
            className="hidden"
          />
          {imageCount > 0 && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✓ {imageCount} product images loaded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};