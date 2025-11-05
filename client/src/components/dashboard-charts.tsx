import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

//todo: remove mock functionality
const attendanceData = [
  { day: 'Seg', consultas: 45, procedimentos: 32, visitas: 28 },
  { day: 'Ter', consultas: 52, procedimentos: 38, visitas: 25 },
  { day: 'Qua', consultas: 48, procedimentos: 35, visitas: 30 },
  { day: 'Qui', consultas: 55, procedimentos: 40, visitas: 27 },
  { day: 'Sex', consultas: 50, procedimentos: 36, visitas: 29 },
];

const attendanceByType = [
  { name: 'Consulta Médica', value: 450, color: 'hsl(var(--chart-1))' },
  { name: 'Enfermagem', value: 320, color: 'hsl(var(--chart-2))' },
  { name: 'Odontologia', value: 180, color: 'hsl(var(--chart-3))' },
  { name: 'Visita Domiciliar', value: 240, color: 'hsl(var(--chart-4))' },
  { name: 'Procedimentos', value: 210, color: 'hsl(var(--chart-5))' },
];

const monthlyTrend = [
  { month: 'Jul', atendimentos: 3200 },
  { month: 'Ago', atendimentos: 3450 },
  { month: 'Set', atendimentos: 3100 },
  { month: 'Out', atendimentos: 3600 },
  { month: 'Nov', atendimentos: 3800 },
  { month: 'Dez', atendimentos: 3950 },
  { month: 'Jan', atendimentos: 4100 },
];

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="consultas" fill="hsl(var(--chart-1))" name="Consultas" />
              <Bar dataKey="procedimentos" fill="hsl(var(--chart-2))" name="Procedimentos" />
              <Bar dataKey="visitas" fill="hsl(var(--chart-3))" name="Visitas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attendanceByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {attendanceByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Tendência Mensal de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="atendimentos" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="Total de Atendimentos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
