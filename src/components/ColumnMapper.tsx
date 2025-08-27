import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ColumnMapping } from "@/types/product";
import { ArrowRight, Settings } from "lucide-react";

interface ColumnMapperProps {
  columns: string[];
  onMappingComplete: (mapping: ColumnMapping) => void;
  isLoading?: boolean;
}

export const ColumnMapper = ({ columns, onMappingComplete, isLoading }: ColumnMapperProps) => {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});

  const requiredFields = [
    { key: 'codebar', label: 'Code Bar', description: 'Barcode for the product' },
    { key: 'qte', label: 'Quantity', description: 'Product quantity' },
    { key: 'prix', label: 'Price', description: 'Product price in euros' },
    { key: 'designation', label: 'Designation', description: 'Product name/description' },
    { key: 'reference', label: 'Reference', description: 'Product reference code' },
  ];

  const handleMappingChange = (field: string, column: string) => {
    setMapping(prev => ({ ...prev, [field]: column }));
  };

  const isComplete = requiredFields.every(field => mapping[field.key as keyof ColumnMapping]);

  const handleSubmit = () => {
    if (isComplete) {
      onMappingComplete(mapping as ColumnMapping);
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Column Mapping
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Map your Excel columns to the required fields
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {requiredFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <p className="text-xs text-muted-foreground">{field.description}</p>
            <Select
              value={mapping[field.key as keyof ColumnMapping] || ""}
              onValueChange={(value) => handleMappingChange(field.key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || isLoading}
            className="w-full"
            variant="hero"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Generate Labels
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};