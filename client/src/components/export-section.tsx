import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";

interface ExportSectionProps {
  jobId: number;
}

export function ExportSection({ jobId }: ExportSectionProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/export`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rfp_responses_${jobId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="bg-gradient-to-r from-success to-green-600 rounded-xl p-6 text-white text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">All Questions Processed!</h3>
            <p className="text-white text-opacity-90">Your RFP responses are ready for download</p>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-white text-success hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Final Responses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
