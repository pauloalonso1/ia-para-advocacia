import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { User, Mail } from 'lucide-react';

const ProfileSettings = () => {
  const { user } = useAuth();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Perfil
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Informações da sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground">Email</Label>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{user?.email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
