import { useState, useEffect } from 'react';
import { useCases, useMessages, Case } from '@/hooks/useCases';
import ConversationsList from './conversations/ConversationsList';
import ChatView from './conversations/ChatView';
import CRMPanel from './conversations/CRMPanel';

const ConversationsView = () => {
  const { cases, loading: casesLoading, updateCaseStatus, updateCaseName } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  const { messages, loading: messagesLoading } = useMessages(selectedCase?.id || null);

  // Keep selectedCase in sync with cases array updates
  useEffect(() => {
    if (selectedCase) {
      const updatedCase = cases.find(c => c.id === selectedCase.id);
      if (updatedCase && (updatedCase.status !== selectedCase.status || updatedCase.client_name !== selectedCase.client_name)) {
        setSelectedCase(updatedCase);
      }
    }
  }, [cases, selectedCase]);

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
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

  return (
    <div className="h-full flex">
      {/* Left: Conversations List */}
      <ConversationsList
        cases={cases}
        selectedCaseId={selectedCase?.id || null}
        onSelectCase={handleSelectCase}
        loading={casesLoading}
      />

      {/* Center: Chat View */}
      <ChatView
        selectedCase={selectedCase}
        messages={messages}
        loading={messagesLoading}
      />

      {/* Right: CRM Panel */}
      <CRMPanel
        selectedCase={selectedCase}
        onUpdateStatus={handleUpdateStatus}
        onUpdateName={handleUpdateName}
      />
    </div>
  );
};

export default ConversationsView;
