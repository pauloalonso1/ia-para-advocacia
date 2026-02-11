import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Loader2 } from "lucide-react";
import { toaster } from "@/components/ui/basic-toast";

const contractTypes = [
  "Prestação de Serviços", "Honorários Advocatícios", "Compra e Venda",
  "Locação", "Parceria", "Confidencialidade (NDA)", "Trabalho", "Contrato Social",
];

interface ContractFormProps {
  isLoading: boolean;
  onGenerate: (data: any) => void;
}

export default function ContractForm({ isLoading, onGenerate }: ContractFormProps) {
  const [conType, setConType] = useState("");
  const [conParties, setConParties] = useState("");
  const [conClauses, setConClauses] = useState("");
  const [conValue, setConValue] = useState("");
  const [conDuration, setConDuration] = useState("");

  const handleGenerate = () => {
    if (!conType) {
      toaster.create({ title: "Campo obrigatório", description: "Selecione o tipo de contrato.", type: "warning" });
      return;
    }
    onGenerate({ type: conType, partiesInfo: conParties, clauses: conClauses, value: conValue, duration: conDuration });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gerar Contrato</CardTitle>
        <CardDescription>Preencha os dados para gerar um contrato profissional</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de Contrato *</Label>
          <Select value={conType} onValueChange={setConType}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              {contractTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Partes Envolvidas</Label>
          <Textarea value={conParties} onChange={(e) => setConParties(e.target.value)} placeholder="Descreva as partes..." rows={2} />
        </div>
        <div>
          <Label>Cláusulas Específicas</Label>
          <Textarea value={conClauses} onChange={(e) => setConClauses(e.target.value)} placeholder="Cláusulas que deseja incluir (opcional)" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor</Label>
            <Input value={conValue} onChange={(e) => setConValue(e.target.value)} placeholder="Ex: R$ 5.000,00" />
          </div>
          <div>
            <Label>Duração</Label>
            <Input value={conDuration} onChange={(e) => setConDuration(e.target.value)} placeholder="Ex: 12 meses" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><ScrollText className="h-4 w-4 mr-2" /> Gerar Contrato</>}
        </Button>
      </CardContent>
    </Card>
  );
}
