import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProcessingJob } from "@shared/schema";

export function useFileProcessing(jobId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch processing job
  const { data: job, isLoading } = useQuery({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await apiRequest("GET", `/api/jobs/${jobId}`);
      return response.json() as Promise<ProcessingJob>;
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if still processing
      return data?.status === "processing" ? 2000 : false;
    },
  });

  // Generate answers mutation
  const generateAnswersMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const response = await apiRequest("POST", `/api/jobs/${jobId}/process`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      toast({
        title: "Processing Started",
        description: "AI is generating responses for your questions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept answer mutation
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
        description: "The answer has been approved and added to your final responses.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Accept Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Regenerate answer mutation
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
        title: "Regenerating Answer",
        description: "AI is generating a new response for this question.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Regenerate Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    job,
    isLoading,
    generateAnswers: generateAnswersMutation.mutate,
    isGenerating: generateAnswersMutation.isPending,
    acceptAnswer: acceptAnswerMutation.mutate,
    regenerateAnswer: regenerateAnswerMutation.mutate,
  };
}