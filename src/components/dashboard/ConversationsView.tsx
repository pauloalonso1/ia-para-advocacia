import { useState, useEffect } from 'react';
import { useCases, useMessages, Case } from '@/hooks/useCases';
import ConversationsList from './conversations/ConversationsList';
import ChatView from './conversations/ChatView';
import CRMPanel from './conversations/CRMPanel';

const ConversationsView = () => {
  const { cases, loading: casesLoading, updateCaseStatus, updateCaseName, deleteCase, assignAgentToCase, markAsRead } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  const { messages, loading: messagesLoading } = useMessages(selectedCase?.id || null);

  // Keep selectedCase in sync with cases array updates
  useEffect(() => {
    if (selectedCase) {
      const updatedCase = cases.find(c => c.id === selectedCase.id);
      if (updatedCase && (
        updatedCase.status !== selectedCase.status || 
        updatedCase.client_name !== selectedCase.client_name ||
        updatedCase.active_agent_id !== selectedCase.active_agent_id
      )) {
        setSelectedCase(updatedCase);
      } else if (!updatedCase) {
        // Case was deleted
        setSelectedCase(null);
      }
    }
  }, [cases, selectedCase]);

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    // Mark as read when selecting
    if (caseItem.unread_count > 0) {
      markAsRead(caseItem.id);
    }
  };

  const handleUpdateStatus = async (caseId: string, status: string) => {
    await updateCaseStatus(caseId, status);
    // Optimistically update the selectedCase
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleUpdateName = async (caseId: string, name: string) => {
    await updateCaseName(caseId, name);
    // Optimistically update the selectedCase
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => prev ? { ...prev, client_name: name } : null);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    const success = await deleteCase(caseId);
    if (success && selectedCase?.id === caseId) {
      setSelectedCase(null);
    }
    return success;
  };

  const handleAssignAgent = async (caseId: string, agentId: string | null) => {
    await assignAgentToCase(caseId, agentId);
    // Optimistically update the selectedCase
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => prev ? { ...prev, active_agent_id: agentId } : null);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left: Conversations List */}
      <ConversationsList
        cases={cases}
        selectedCaseId={selectedCase?.id || null}
        onSelectCase={handleSelectCase}
        onDeleteCase={handleDeleteCase}
        loading={casesLoading}
      />

      {/* Center: Chat View */}
      <ChatView
        selectedCase={selectedCase}
        messages={messages}
        loading={messagesLoading}
        onPauseAgent={(caseId) => handleAssignAgent(caseId, null)}
      />

      {/* Right: CRM Panel */}
      <CRMPanel
        selectedCase={selectedCase}
        onUpdateStatus={handleUpdateStatus}
        onUpdateName={handleUpdateName}
        onAssignAgent={handleAssignAgent}
      />
    </div>
  );
};

export default ConversationsView;
