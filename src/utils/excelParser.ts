import * as XLSX from 'xlsx';
import { Product, ColumnMapping } from '@/types/product';

export const parseExcelFile = async (file: File): Promise<{ data: any[][], columns: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }
        
        // First row should contain headers
        const columns = jsonData[0].map((col: any) => col?.toString() || '');
        
        resolve({ data: jsonData, columns });
      } catch (error) {
        reject(new Error('Error parsing Excel file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

export const mapDataToProducts = (
  data: any[][],
  mapping: ColumnMapping,
  imageFiles: Map<string, string>
): Product[] => {
  if (data.length < 2) return []; // Need at least header + 1 data row
  
  const headers = data[0];
  const dataRows = data.slice(1);
  
  // Find column indices
  const indices = {
    codebar: headers.indexOf(mapping.codebar),
    qte: headers.indexOf(mapping.qte),
    prix: headers.indexOf(mapping.prix),
    designation: headers.indexOf(mapping.designation),
    reference: headers.indexOf(mapping.reference),
  };
  
  // Validate all columns found
  const missingColumns = Object.entries(indices)
    .filter(([_, index]) => index === -1)
    .map(([key]) => mapping[key as keyof ColumnMapping]);
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
  }
  
  return dataRows
    .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map((row, index) => {
      try {
        const reference = String(row[indices.reference] || '').trim();
        const codebar = String(row[indices.codebar] || '').trim();
        const designation = String(row[indices.designation] || '').trim();
        const qte = parseInt(String(row[indices.qte] || '1')) || 1;
        const prix = parseFloat(String(row[indices.prix] || '0')) || 0;
        
        if (!reference || !codebar || !designation) {
          console.warn(`Skipping row ${index + 2}: missing required data`);
          return null;
        }
        
        const product: Product = {
          reference,
          codebar,
          designation,
          qte,
          prix,
          image: imageFiles.get(reference),
        };
        
        return product;
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        return null;
      }
    })
    .filter((product): product is Product => product !== null);
};

export const processImageFiles = (files: FileList): Map<string, string> => {
  const imageMap = new Map<string, string>();
  
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      // Extract reference from filename (remove extension)
      const filename = file.name;
      const reference = filename.replace(/\.[^/.]+$/, '');
      const imageUrl = URL.createObjectURL(file);
      imageMap.set(reference, imageUrl);
    }
  });
  
  return imageMap;
};