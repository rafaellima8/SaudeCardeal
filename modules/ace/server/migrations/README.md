# ACE Module Migrations

Este diretório contém as migrations SQL para o módulo ACE.

## Aplicar Migrations

As migrations devem ser aplicadas manualmente usando o execute_sql_tool ou através do psql:

```bash
# Via psql (desenvolvimento)
psql $DATABASE_URL -f modules/ace/server/migrations/001_create_ace_tables.sql

# Via execute_sql_tool (recomendado no Replit)
# Use o conteúdo do arquivo SQL no execute_sql_tool
```

## Migrations Disponíveis

- `001_create_ace_tables.sql` - Cria as tabelas base do módulo ACE:
  - `ace_dwellings` - Imóveis do ACE
  - `ace_visits` - Visitas domiciliares do ACE
  - `ace_foci` - Focos de vetores
  - `ace_audit_logs` - Logs de auditoria

## Namespace

Todas as tabelas do módulo ACE usam o prefixo `ace_` para evitar conflitos com as tabelas principais do sistema.

## Índices

A migration inclui índices otimizados para:
- Consultas por geolocalização (latitude/longitude)
- Relações entre tabelas (foreign keys)
- Consultas por data
- Consultas por status
