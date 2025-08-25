import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { ProgressTracker } from "@/components/progress-tracker";
import { QuestionCard } from "@/components/question-card";
import { ExportSection } from "@/components/export-section";
import { useFileProcessing } from "@/hooks/use-file-processing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Settings, FileText, Bolt, Download } from "lucide-react";

export default function Home() {
  const [jobId, setJobId] = useState<number | null>(null);
  const { 
    job, 
    isLoading, 
    generateAnswers, 
    acceptAnswer, 
    regenerateAnswer,
    isGenerating 
  } = useFileProcessing(jobId);

  const handleFileUploaded = (newJobId: number) => {
    setJobId(newJobId);
  };

  const handleGenerateAnswers = async () => {
    if (jobId) {
      await generateAnswers();
    }
  };

  const allQuestionsAccepted = job?.questions?.every(q => q.accepted) || false;
  const acceptedCount = job?.questions?.filter(q => q.accepted).length || 0;
  const pendingCount = (job?.questions?.length || 0) - acceptedCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">NetraASSIST</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <Shield className="h-4 w-4 text-success" />
                <span>API Connected</span>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* App Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Automated Answer Generator</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your RFP documents and get AI-powered answers instantly. Supporting Excel and PDF formats with intelligent question extraction.
          </p>
        </div>

        {/* File Upload Section */}
        <FileUpload onFileUploaded={handleFileUploaded} />

        {/* Processing Button */}
        {jobId && job && job.questions && job.questions.length > 0 && job.status === "processing" && (
          <div className="text-center mb-8">
            <Button
              onClick={handleGenerateAnswers}
              disabled={isGenerating}
              className="px-8 py-3 text-lg font-medium"
              size="lg"
            >
              <Bolt className="h-5 w-5 mr-2" />
              {isGenerating ? "Generating..." : "Generate Responses"}
            </Button>
          </div>
        )}

        {/* Progress Section */}
        {isGenerating && job && (
          <ProgressTracker 
            current={job.questions?.filter(q => q.status === "completed").length || 0}
            total={job.questions?.length || 0}
          />
        )}

        {/* Results Section */}
        {job && job.questions && job.questions.length > 0 && job.status === "completed" && (
          <div className="space-y-6">
            {/* Results Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Review Responses</h3>
                    <p className="text-gray-600 text-sm mt-1">Review and approve each AI-generated answer</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-success">{acceptedCount}</span> accepted, 
                      <span className="font-medium text-warning ml-1">{pendingCount}</span> pending
                    </div>
                    <Button
                      disabled={!allQuestionsAccepted}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Cards */}
            <div className="space-y-4">
              {job.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  questionNumber={index + 1}
                  onAccept={() => acceptAnswer(question.id)}
                  onRegenerate={() => regenerateAnswer(question.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Export Section */}
        {allQuestionsAccepted && job && (
          <ExportSection jobId={job.id} />
        )}
      </main>
    </div>
  );
}