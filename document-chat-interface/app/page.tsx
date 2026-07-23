"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { EmailGate } from "@/components/EmailGate";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { useDocuments } from "@/hooks/useDocuments";
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";

function ChatHeaderActions() {
  const { logout } = useUser();
  return (
    <button
      onClick={logout}
      className="px-3 py-1 text-sm rounded border border-border hover:bg-muted transition-colors text-foreground cursor-pointer"
    >
      Sign Out
    </button>
  );
}

export default function Home() {
  const { user, isLoading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    documents,
    selectedDocIds,
    uploading,
    uploadDoc,
    deleteDoc,
    toggleDocSelection,
    refetch: refetchDocs,
  } = useDocuments(user?.id || null);
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    deleteConvo,
    newConversation,
    refetch: refetchConvos,
  } = useConversations(user?.id || null);
  const {
    messages,
    loading,
    error,
    sendMessage,
    loadConversation,
    clearMessages,
  } = useChat(user?.id || null);

  const {
    connectionState,
    isChecking,
    justReconnected,
    checkConnection,
  } = useConnectionStatus();

  const handleReconnect = async () => {
    const isConnected = await checkConnection();
    if (isConnected) {
      refetchDocs();
      refetchConvos();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-border border-t-accent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show email gate if not authenticated
  if (!user) {
    return <EmailGate />;
  }

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    const newConversationId = await sendMessage(
      content,
      currentConversationId,
      Array.from(selectedDocIds),
    );

    if (newConversationId && !currentConversationId) {
      // Create optimistic conversation entry
      addConversation({
        id: newConversationId,
        title: content.substring(0, 50),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    clearMessages();
    newConversation();
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    loadConversation(conversationId);
  };

  // Handle conversation deletion
  const handleDeleteConversation = (conversationId: string) => {
    deleteConvo(conversationId);
    if (currentConversationId === conversationId) {
      handleNewChat();
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background">
      {/* Network & Server Disconnection Status Banner */}
      <ConnectionStatusBanner
        connectionState={connectionState}
        isChecking={isChecking}
        justReconnected={justReconnected}
        onRefresh={handleReconnect}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          absolute inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col
          transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar
            documents={documents}
            selectedDocIds={selectedDocIds}
            conversations={conversations}
            currentConversationId={currentConversationId}
            onUploadDoc={uploadDoc}
            onToggleDocSelect={toggleDocSelection}
            onDeleteDoc={deleteDoc}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            uploading={uploading}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header */}
          <div className="border-b border-border px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 text-foreground hover:bg-muted rounded-md"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Chat</h1>
                <p className="text-xs text-muted-foreground">
                  Signed in as {user?.email}
                </p>
              </div>
            </div>
            <ChatHeaderActions />
          </div>

          {/* Chat Panel */}
          <ChatPanel
            messages={messages}
            loading={loading}
            error={error}
            onSendMessage={handleSendMessage}
            hasSelectedDocs={selectedDocIds.size > 0}
          />
        </div>
      </div>
    </div>
  );
}
