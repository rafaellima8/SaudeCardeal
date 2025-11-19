// Temporarily disabled - schema reduced for SQLite auth demo
// TODO: Re-enable when full schema is restored

export default function TerritoryPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Gestão Territorial</h1>
          <p className="text-muted-foreground max-w-md">
            Módulo temporariamente indisponível enquanto o banco de dados é configurado.
            <br />
            O sistema de autenticação está funcionando normalmente.
          </p>
        </div>
      </div>
    </div>
  );
}
