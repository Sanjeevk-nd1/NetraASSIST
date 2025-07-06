import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Question } from "@shared/schema";
import { Check, RotateCcw, ChevronDown, ChevronUp, Loader2, FileText } from "lucide-react";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  onAccept: () => void;
  onRegenerate: () => void;
}

export function QuestionCard({ question, questionNumber, onAccept, onRegenerate }: QuestionCardProps) {
  const [isOpen, setIsOpen] = useState(!question.accepted);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return question.accepted ? "bg-success text-white" : "bg-warning text-white";
      case "processing":
        return "bg-gray-200 text-gray-600";
      case "failed":
        return "bg-destructive text-white";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  const getStatusIcon = () => {
    if (question.accepted) {
      return <Check className="h-4 w-4" />;
    }
    if (question.status === "processing") {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return questionNumber;
  };

  const getStatusText = () => {
    if (question.accepted) return "Accepted";
    if (question.status === "processing") return "Generating...";
    if (question.status === "failed") return "Failed";
    return "Pending Review";
  };

  return (
    <Card className={`overflow-hidden ${!question.accepted && question.status === "completed" ? "border-2 border-primary" : ""}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-6 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStatusColor(question.status)}`}>
                  {getStatusIcon()}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Question {questionNumber}</h4>
                  <Badge variant={question.accepted ? "default" : "secondary"} className="text-xs">
                    {getStatusText()}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {!isOpen && (
              <div className="mt-2 ml-11">
                <p className="text-gray-600 text-sm truncate">{question.text}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="px-6 pb-6">
            {/* Question Text */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 font-medium">{question.text}</p>
            </div>
            
            {/* Answer */}
            {question.answer && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">{question.answer}</p>
                
                {/* Sources */}
                {question.sources && question.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center space-x-1 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Sources:</span>
                    </div>
                    <div className="space-y-2">
                      {question.sources.map((source, idx) => (
                        <div key={idx} className="bg-white border border-blue-200 rounded p-2">
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {source}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Processing State */}
            {question.status === "processing" && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI is generating response...</span>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            {question.status === "completed" && !question.accepted && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={onAccept}
                  className="bg-success hover:bg-success/90 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={onRegenerate}
                  variant="outline"
                  className="text-gray-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                
                {/* Sources Button */}
                {question.sources && question.sources.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      // Scroll to sources section
                      const sourcesElement = document.querySelector(`[data-question-id="${question.id}"] .sources-section`);
                      sourcesElement?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Sources ({question.sources.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
