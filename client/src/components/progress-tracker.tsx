import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressTrackerProps {
  current: number;
  total: number;
}

export function ProgressTracker({ current, total }: ProgressTrackerProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Processing Questions</h3>
          <span className="text-sm text-gray-500">
            {current} of {total} questions
          </span>
        </div>
        
        <Progress value={progress} className="mb-4" />
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating AI-powered answers...</span>
        </div>
      </CardContent>
    </Card>
  );
}
