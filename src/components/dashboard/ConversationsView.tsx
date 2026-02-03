import { useState } from 'react';
import { useCases, useMessages, Case } from '@/hooks/useCases';
import ConversationsList from './conversations/ConversationsList';
import ChatView from './conversations/ChatView';
import CRMPanel from './conversations/CRMPanel';

const ConversationsView = () => {
  const { cases, loading: casesLoading, updateCaseStatus, updateCaseName } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  const { messages, loading: messagesLoading } = useMessages(selectedCase?.id || null);

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
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
        onUpdateStatus={updateCaseStatus}
        onUpdateName={updateCaseName}
      />
    </div>
  );
};

export default ConversationsView;
