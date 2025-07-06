import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Zap } from "lucide-react";

interface ProgressTrackerProps {
  current: number;
  total: number;
}

export function ProgressTracker({ current, total }: ProgressTrackerProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Processing</h3>
                <p className="text-sm text-gray-600">Generating intelligent responses</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{percentage}%</div>
              <div className="text-sm text-gray-500">{current} of {total}</div>
            </div>
          </div>
          
          <Progress value={percentage} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Processing questions...</span>
            </div>
            {current === total && total > 0 && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Complete!</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}