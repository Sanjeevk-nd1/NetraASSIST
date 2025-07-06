import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ProcessingJob } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useFileProcessing(jobId: number | null) {
  const [pollingInterval, setPollingInterval] = useState<number | false>(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: job, isLoading } = useQuery({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await apiRequest("GET", `/api/jobs/${jobId}`);
      return response.json() as Promise<ProcessingJob>;
    },
    enabled: !!jobId,
    refetchInterval: pollingInterval,
  });

  const generateAnswersMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const response = await apiRequest("POST", `/api/jobs/${jobId}/generate`);
      return response.json();
    },
    onSuccess: () => {
      setPollingInterval(1000); // Start polling every second
      toast({
        title: "Processing Started",
        description: "Generating AI-powered answers...",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const acceptAnswerMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!jobId) throw new Error("No job ID");
      const response = await apiRequest("POST", `/api/jobs/${jobId}/accept`, {
        questionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      toast({
        title: "Answer Accepted",
        description: "Answer has been accepted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Accept Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateAnswerMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!jobId) throw new Error("No job ID");
      const response = await apiRequest("POST", `/api/jobs/${jobId}/regenerate`, {
        questionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      toast({
        title: "Answer Regenerated",
        description: "New answer has been generated",
      });
    },
    onError: (error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop polling when job is completed
  useEffect(() => {
    if (job?.status === "completed") {
      setPollingInterval(false);
    }
  }, [job?.status]);

  // Auto-scroll to next unaccepted question
  useEffect(() => {
    if (job?.questions && job.status === "completed") {
      const firstUnaccepted = job.questions.find(q => !q.accepted);
      if (firstUnaccepted) {
        // Scroll to the first unaccepted question
        setTimeout(() => {
          const element = document.querySelector(`[data-question-id="${firstUnaccepted.id}"]`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 500);
      }
    }
  }, [job?.questions, job?.status]);

  return {
    job,
    isLoading,
    generateAnswers: generateAnswersMutation.mutate,
    acceptAnswer: acceptAnswerMutation.mutate,
    regenerateAnswer: regenerateAnswerMutation.mutate,
    isGenerating: generateAnswersMutation.isPending || pollingInterval !== false,
  };
}
