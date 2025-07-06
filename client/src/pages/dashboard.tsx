import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { ProgressTracker } from "@/components/progress-tracker";
import { QuestionCard } from "@/components/question-card";
import { ExportSection } from "@/components/export-section";
import { ChatBot } from "@/components/chat-bot";
import { AdminPanel } from "@/components/admin-panel";
import { useFileProcessing } from "@/hooks/use-file-processing";
import { 
  FileText, 
  MessageCircle, 
  Settings, 
  LogOut, 
  Shield, 
  Download,
  Bolt,
  User
} from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
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

  const isAdmin = user?.role === "admin";

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
              <h1 className="text-xl font-semibold text-gray-900">RFP Automated</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.username}</span>
                {isAdmin && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Main Features (3/4 width) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Welcome Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.username}!
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Upload your documents and get AI-powered responses, or chat with our assistant for instant help.
              </p>
            </div>

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Document Processing</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="admin" className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="upload" className="space-y-6 mt-6">
                {/* File Upload Section */}
                <FileUpload onFileUploaded={handleFileUploaded} />

                {/* Processing Button */}
                {jobId && job && job.questions && job.questions.length > 0 && job.status === "processing" && (
                  <div className="text-center">
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
                            {allQuestionsAccepted && (
                              <Button
                                className="bg-success hover:bg-success/90 text-white"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Results
                              </Button>
                            )}
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

                    {/* Export Section */}
                    {allQuestionsAccepted && job && (
                      <ExportSection jobId={job.id} />
                    )}
                  </div>
                )}
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin" className="mt-6">
                  <AdminPanel />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Right Column - ChatBot (1/4 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ChatBot />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-primary text-white rounded-lg p-2">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="font-semibold text-gray-900">RFP Automated</span>
              </div>
              <p className="text-gray-600 text-sm">
                Streamline your RFP process with AI-powered document processing and intelligent response generation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• AI-powered question extraction</li>
                <li>• Intelligent response generation</li>
                <li>• Interactive review process</li>
                <li>• Real-time chat assistance</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Excel & PDF support</li>
                <li>• Source citation</li>
                <li>• Export functionality</li>
                <li>• Admin management</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 RFP Automated. Built with AI for efficient proposal management.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}