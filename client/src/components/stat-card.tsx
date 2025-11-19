import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card className="dashboard-card card-hover">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-sm font-medium text-foreground">
            {title}
          </CardTitle>
        </div>
        <div className="dashboard-card-icon">
          <Icon className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? 'text-status-success' : 'text-status-error'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% em relação ao mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
