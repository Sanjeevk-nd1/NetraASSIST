import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedFile {
  id: number;
  userId: number;
  jobId: number | null;
  conversationId: number | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export function PreviousFiles() {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/files", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load previous files",
      });
      console.error("Fetch files error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download file",
      });
      console.error("Download file error:", error);
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
      setFiles(files.filter(file => file.id !== fileId));
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file",
      });
      console.error("Delete file error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Previous Files</h3>
          <p className="text-gray-600 text-sm mt-1">
            View and manage your previously generated files
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-gray-600">Loading files...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-600">No files found. Generate and export files to see them here.</p>
      ) : (
        <div className="space-y-4">
          {files.map(file => (
            <Card key={file.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(file.createdAt).toLocaleString()} | Size: {(file.fileSize / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.jobId ? `Job ID: ${file.jobId}` : `Conversation ID: ${file.conversationId}`}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.fileName)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}