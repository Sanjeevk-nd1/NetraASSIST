import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface ExportSectionProps {
  jobId: number;
}

export function ExportSection({ jobId }: ExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/export`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rfp-responses-${jobId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsExporting(false);
      toast({
        title: "Export Complete",
        description: "Your responses have been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      setIsExporting(false);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Export Results</span>
        </CardTitle>
        <CardDescription>
          Download your approved responses as an Excel file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">Ready for Export</span>
            </div>
            <p className="text-sm text-green-700">
              All questions have been reviewed and approved. You can now download the final Excel file with your responses.
            </p>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting || exportMutation.isPending}
            className="w-full bg-success hover:bg-success/90 text-white"
            size="lg"
          >
            {isExporting || exportMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Excel File...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Download Excel File
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              The file will include all questions and approved answers with formatting
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}