import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Download, 
  Trash2, 
  Bot, 
  User,
  FileText,
  Loader2,
  Plus
} from "lucide-react";
import type { ChatMessage, Conversation } from "@shared/schema";

export function ChatBot() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/conversations");
      return response.json() as Promise<Conversation[]>;
    },
  });

  // Fetch chat history for selected conversation
  const { data: chatHistory = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/chat/history", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const response = await apiRequest("GET", `/api/chat/history/${selectedConversationId}`);
      return response.json() as Promise<ChatMessage[]>;
    },
    enabled: !!selectedConversationId,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      return response.json() as Promise<Conversation>;
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(newConversation.id);
      toast({
        title: "New Conversation Created",
        description: "Start chatting in your new conversation!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message, conversationId: selectedConversationId });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", selectedConversationId] });
    },
    onError: (error: any) => {
      setIsTyping(false);
      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear conversation history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("DELETE", `/api/chat/history/${selectedConversationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", selectedConversationId] });
      toast({
        title: "Conversation Cleared",
        description: "The conversation history has been cleared.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("DELETE", `/api/conversations/${selectedConversationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(null);
      toast({
        title: "Conversation Deleted",
        description: "The conversation has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Download conversation history as Excel
  const downloadChatHistory = async () => {
    if (!selectedConversationId || chatHistory.length === 0) {
      toast({
        title: "No Chat History",
        description: "There's no chat history to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/chat/export/${selectedConversationId}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat_history_${selectedConversationId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: "Your conversation history has been downloaded as an Excel file.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    if (!selectedConversationId) {
      createConversationMutation.mutate();
      return;
    }

    setIsTyping(true);
    sendMessageMutation.mutate(message.trim());
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span>AI Assistant</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadChatHistory}
              disabled={!selectedConversationId || chatHistory.length === 0}
              title="Download conversation history"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={!selectedConversationId || chatHistory.length === 0 || clearHistoryMutation.isPending}
              title="Clear conversation history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteConversationMutation.mutate()}
              disabled={!selectedConversationId || deleteConversationMutation.isPending}
              title="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => createConversationMutation.mutate()}
              disabled={createConversationMutation.isPending}
              title="Start new conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Ask questions about your documents or get help with RFP processing
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-y-auto">
        {/* Conversation Selector */}
        <div className="px-4 py-2 border-b">
          <Select
            value={selectedConversationId?.toString() || ""}
            onValueChange={(value) => setSelectedConversationId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a conversation" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingConversations ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : conversations.length === 0 ? (
                <SelectItem value="empty" disabled>No conversations yet</SelectItem>
              ) : (
                conversations.map((conv) => (
                  <SelectItem key={conv.id} value={conv.id.toString()}>
                    {conv.title} ({new Date(conv.updatedAt).toLocaleDateString()})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Select or start a new conversation!</p>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Start a conversation!</p>
              <p className="text-gray-400 text-xs mt-1">Ask me anything about your documents</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {chatHistory.map((msg, index) => (
                <div key={msg.id || index} className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-800">{msg.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.createdAt!).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-800 leading-relaxed">{msg.response}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="flex items-center space-x-1 mb-1">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-600">Sources:</span>
                            </div>
                            <div className="space-y-1">
                              {msg.sources.map((source, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {source.length > 50 ? `${source.substring(0, 50)}...` : source}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">AI Assistant</p>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                        <span className="text-xs text-blue-600 ml-2">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your documents..."
              disabled={sendMessageMutation.isPending || createConversationMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending || createConversationMutation.isPending}
              size="sm"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Powered by AI • Real-time document analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}