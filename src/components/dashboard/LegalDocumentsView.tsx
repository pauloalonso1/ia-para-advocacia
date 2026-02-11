import { useState } from "react";
import { AILoader } from "@/components/ui/ai-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ScrollText, Search } from "lucide-react";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { usePetitionTemplates } from "@/hooks/usePetitionTemplates";
import { useTeamMembers } from "@/hooks/useTeamMembers";

import PetitionForm from "./legal/PetitionForm";
import ContractForm from "./legal/ContractForm";
import AnalysisForm from "./legal/AnalysisForm";
import DocumentPreview from "./legal/DocumentPreview";
import TemplatesModal from "./legal/TemplatesModal";

export default function LegalDocumentsView() {
  const { isLoading, result, setResult, generatePetition, analyzePetition, generateContract, analyzeContract } = useLegalDocuments();
  const { templates, saveTemplate, deleteTemplate, updateTemplate } = usePetitionTemplates();
  const { activeMembers } = useTeamMembers();
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  return (
    <>
      {isLoading && <AILoader />}
      <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Documentos Jurídicos
          </h2>
          <p className="text-muted-foreground">Gere e analise petições e contratos com IA</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Tabs defaultValue="petition" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="petition" className="gap-1.5">
                  <FileText className="h-4 w-4" /> Petição
                </TabsTrigger>
                <TabsTrigger value="contract" className="gap-1.5">
                  <ScrollText className="h-4 w-4" /> Contrato
                </TabsTrigger>
                <TabsTrigger value="analyze" className="gap-1.5">
                  <Search className="h-4 w-4" /> Analisar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="petition">
                <PetitionForm
                  isLoading={isLoading}
                  templates={templates}
                  activeMembers={activeMembers}
                  onGenerate={generatePetition}
                  onSaveTemplate={saveTemplate}
                  onOpenTemplatesModal={() => setShowTemplatesModal(true)}
                />
              </TabsContent>

              <TabsContent value="contract">
                <ContractForm isLoading={isLoading} onGenerate={generateContract} />
              </TabsContent>

              <TabsContent value="analyze">
                <AnalysisForm isLoading={isLoading} onAnalyzePetition={analyzePetition} onAnalyzeContract={analyzeContract} />
              </TabsContent>
            </Tabs>
          </div>

          <DocumentPreview result={result} isLoading={isLoading} />
        </div>
      </div>

      <TemplatesModal
        open={showTemplatesModal}
        onOpenChange={setShowTemplatesModal}
        templates={templates}
        onSelect={(id) => {
          /* Template selection is handled internally by PetitionForm */
          setShowTemplatesModal(false);
        }}
        onDelete={deleteTemplate}
        onUpdate={updateTemplate}
      />
    </>
  );
}
