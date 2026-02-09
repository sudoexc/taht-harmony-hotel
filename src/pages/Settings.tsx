import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.settings.hotelName}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.settings.hotelName}</Label>
              <Input defaultValue="Taht" />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.timezone}</Label>
              <Input defaultValue="Asia/Tashkent" disabled />
            </div>
          </div>
          <Button>{t.common.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.settings.users}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.settings.fullName}</TableHead>
                <TableHead>{t.settings.role}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Admin User</TableCell>
                <TableCell><Badge>ADMIN</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Manager User</TableCell>
                <TableCell><Badge variant="secondary">MANAGER</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
