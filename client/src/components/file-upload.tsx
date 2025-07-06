import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, CheckCircle, X, CloudUpload } from "lucide-react";

interface FileUploadProps {
  onFileUploaded: (jobId: number) => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [selectedFileType, setSelectedFileType] = useState<"excel" | "pdf">("excel");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedFileType);

      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `File uploaded successfully. Found ${data.questionsCount} questions.`,
      });
      onFileUploaded(data.jobId);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  const isExcelSelected = selectedFileType === "excel";
  const isPdfSelected = selectedFileType === "pdf";

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
        
        {/* File Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose input type</label>
          <div className="flex space-x-4">
            <Button
              variant={isExcelSelected ? "default" : "outline"}
              onClick={() => setSelectedFileType("excel")}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Excel</span>
            </Button>
            <Button
              variant={isPdfSelected ? "default" : "outline"}
              onClick={() => setSelectedFileType("pdf")}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </Button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!uploadedFile && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary"
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CloudUpload className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Drop your file here</h4>
            <p className="text-gray-500 mb-4">or click to browse</p>
            <div className="flex justify-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-success" />
                Excel (.xlsx)
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-success" />
                PDF (.pdf)
              </span>
            </div>
          </div>
        )}

        {/* File Preview */}
        {uploadedFile && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB • {selectedFileType.toUpperCase()} file
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {uploadMutation.isPending && (
              <div className="mt-3">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-500 mt-1">Uploading and processing...</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
