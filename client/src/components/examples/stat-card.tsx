import { StatCard } from '../stat-card'
import { Users, Calendar, AlertCircle, Activity } from 'lucide-react'

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatCard
        title="Atendimentos Hoje"
        value="127"
        icon={Activity}
        description="52 consultas, 45 procedimentos, 30 visitas"
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Fila de Espera"
        value="23"
        icon={Calendar}
        description="Aguardando atendimento"
        trend={{ value: 5, isPositive: false }}
      />
      <StatCard
        title="Estoque Crítico"
        value="8"
        icon={AlertCircle}
        description="Medicamentos abaixo do mínimo"
      />
      <StatCard
        title="Pacientes Cadastrados"
        value="12.547"
        icon={Users}
        description="Total de cidadãos"
        trend={{ value: 3, isPositive: true }}
      />
    </div>
  )
}
