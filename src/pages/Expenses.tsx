import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockExpenses } from "@/data/mockData";
import { formatCurrency } from "@/lib/format";

const Expenses = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.expenses.title}</h1>
        <Button><Plus className="mr-1 h-4 w-4" />{t.expenses.addExpense}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.expenses.date}</TableHead>
                <TableHead>{t.expenses.category}</TableHead>
                <TableHead>{t.expenses.amount}</TableHead>
                <TableHead>{t.expenses.method}</TableHead>
                <TableHead>{t.expenses.comment}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExpenses.map(expense => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.spent_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.expenseCategory[expense.category]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.paymentMethod[expense.method]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{expense.comment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
