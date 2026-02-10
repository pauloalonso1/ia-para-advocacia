import { useState, useEffect } from 'react';
import { useCases, useMessages, Case } from '@/hooks/useCases';
import { useProfilePictures } from '@/hooks/useProfilePictures';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationsList from './conversations/ConversationsList';
import ChatView from './conversations/ChatView';
import CRMPanel from './conversations/CRMPanel';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';


const ConversationsView = () => {
  const { cases, loading: casesLoading, updateCaseStatus, updateCaseName, deleteCase, assignAgentToCase, pauseAgentForCase, markAsRead } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const { pictures, fetchMultiple } = useProfilePictures();
  const isMobile = useIsMobile();
  const [showCRMPanel, setShowCRMPanel] = useState(false);
  
  const { messages, loading: messagesLoading } = useMessages(selectedCase?.id || null);

  // Fetch profile pictures for visible cases
  useEffect(() => {
    if (cases.length > 0) {
      const phones = cases.map(c => c.client_phone);
      fetchMultiple(phones);
    }
  }, [cases, fetchMultiple]);

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
        setSelectedCase(null);
      }
    }
  }, [cases, selectedCase]);

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    if (caseItem.unread_count > 0) {
      markAsRead(caseItem.id);
    }
  };

  const handleBack = () => {
    setSelectedCase(null);
  };

  const handleUpdateStatus = async (caseId: string, status: string) => {
    await updateCaseStatus(caseId, status);
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleUpdateName = async (caseId: string, name: string) => {
    await updateCaseName(caseId, name);
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
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => prev ? { ...prev, active_agent_id: agentId } : null);
    }
  };

  // Mobile layout: show list OR chat, not both
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {!selectedCase ? (
          <ConversationsList
            cases={cases}
            selectedCaseId={null}
            onSelectCase={handleSelectCase}
            onDeleteCase={handleDeleteCase}
            loading={casesLoading}
            profilePictures={pictures}
            isMobile
          />
        ) : (
          <>
            <ChatView
              selectedCase={selectedCase}
              messages={messages}
              loading={messagesLoading}
              onPauseAgent={(caseId) => pauseAgentForCase(caseId)}
              profilePictureUrl={selectedCase ? pictures[selectedCase.client_phone] : undefined}
              onBack={handleBack}
              onOpenCRM={() => setShowCRMPanel(true)}
              isMobile
            />
            <Sheet open={showCRMPanel} onOpenChange={setShowCRMPanel}>
              <SheetContent side="right" className="w-[85vw] sm:max-w-sm p-0">
                <SheetTitle className="sr-only">Detalhes do contato</SheetTitle>
                <CRMPanel
                  selectedCase={selectedCase}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateName={handleUpdateName}
                  onAssignAgent={handleAssignAgent}
                  profilePictureUrl={selectedCase ? pictures[selectedCase.client_phone] : undefined}
                  isMobile
                />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <ConversationsList
        cases={cases}
        selectedCaseId={selectedCase?.id || null}
        onSelectCase={handleSelectCase}
        onDeleteCase={handleDeleteCase}
        loading={casesLoading}
        profilePictures={pictures}
      />
      <ChatView
        selectedCase={selectedCase}
        messages={messages}
        loading={messagesLoading}
        onPauseAgent={(caseId) => pauseAgentForCase(caseId)}
        profilePictureUrl={selectedCase ? pictures[selectedCase.client_phone] : undefined}
      />
      <CRMPanel
        selectedCase={selectedCase}
        onUpdateStatus={handleUpdateStatus}
        onUpdateName={handleUpdateName}
        onAssignAgent={handleAssignAgent}
        profilePictureUrl={selectedCase ? pictures[selectedCase.client_phone] : undefined}
      />
    </div>
  );
};

export default ConversationsView;
