import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Question } from "@shared/schema";
import { Check, RotateCcw, ChevronDown, ChevronUp, Loader2, FileText, Eye, Edit2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  onAccept: () => void;
  onRegenerate: () => void;
  onUpdateAnswer: (id: string, newAnswer: string) => void;
}

export function QuestionCard({ question, questionNumber, onAccept, onRegenerate, onUpdateAnswer }: QuestionCardProps) {
  const [isOpen, setIsOpen] = useState(!question.accepted);
  const [showSources, setShowSources] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState(question.answer || "");
  const { user } = useAuth();

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      onUpdateAnswer(question.id, editedAnswer);
    }
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
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 font-medium">{question.text}</p>
            </div>
            
            {question.answer && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full min-h-[100px] text-gray-700"
                      placeholder="Edit the answer..."
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedAnswer(question.answer || "");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          onUpdateAnswer(question.id, editedAnswer);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 leading-relaxed">{question.answer}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-blue-600 hover:bg-blue-50"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Answer
                    </Button>
                  </>
                )}
                
                {user?.role === "admin" && question.sources && question.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Sources:</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSources(!showSources)}
                        className="text-blue-600 hover:text-blue-700 h-6 px-2"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        <span className="text-xs">
                          {showSources ? "Hide" : "View"}
                        </span>
                      </Button>
                    </div>
                    {showSources && (
                      <ul className="text-sm text-gray-600 list-disc pl-4">
                        {question.sources.map((source, index) => (
                          <li key={index}>{source}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {question.status === "completed" && !question.accepted && (
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={question.status === "processing"}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  onClick={onAccept}
                  disabled={question.status === "processing"}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}