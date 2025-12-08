# Root Cleanup Report - ArgoSaude v2.1

**Data**: 2025-12-08  
**Status**: Análise em PLAN MODE  
**Autor**: ArgoSaude Agent - Modo Especialista Sênior

---

## 1. Arquivos na Raiz

### 1.1 Arquivos de Configuração (MANTER)

| Arquivo | Propósito | Status |
|---------|-----------|--------|
| package.json | Dependências Node.js | OK |
| package-lock.json | Lock de dependências | OK |
| tsconfig.json | Configuração TypeScript | OK |
| vite.config.ts | Configuração Vite | OK |
| tailwind.config.ts | Configuração Tailwind | OK |
| postcss.config.js | Configuração PostCSS | OK |
| drizzle.config.ts | Configuração Drizzle | OK |
| playwright.config.ts | Configuração Playwright | OK |
| vitest.config.ts | Configuração Vitest | OK |
| components.json | Configuração shadcn | OK |

### 1.2 Arquivos de Documentação (AVALIAR)

| Arquivo | Conteúdo | Ação Sugerida |
|---------|----------|---------------|
| replit.md | Documentação principal | MANTER |
| design_guidelines.md | Guidelines de design | MANTER |
| CLEANUP_LOG.md | Log de limpeza antiga | ARQUIVAR |
| CONSOLIDATION_REPORT.md | Relatório consolidação | ARQUIVAR |
| ROOT_SCAN_REPORT.md | Scan anterior | ARQUIVAR |
| SINAN_SYNC_PLAN.md | Plano SINAN | ARQUIVAR após implementação |
| SINAN_SYNC_REPORT.md | Relatório SINAN | ARQUIVAR após implementação |

### 1.3 Arquivos de Database (MANTER)

| Arquivo | Propósito | Status |
|---------|-----------|--------|
| saude.db | Database SQLite | OK |
| saude.db-shm | SQLite shared memory | OK |
| saude.db-wal | SQLite WAL log | OK |

---

## 2. Diretórios

### 2.1 Diretórios de Código (MANTER)

| Diretório | Conteúdo | Status |
|-----------|----------|--------|
| client/ | Frontend React | OK |
| server/ | Backend Express | OK |
| shared/ | Tipos compartilhados | OK |
| modules/ | Módulos de automação | OK |

### 2.2 Diretórios de Suporte (MANTER)

| Diretório | Conteúdo | Status |
|-----------|----------|--------|
| tests/ | Testes E2E | OK |
| scripts/ | Scripts utilitários | OK |
| migrations/ | Migrations Drizzle | OK |
| docs/ | Documentação técnica | OK |

### 2.3 Diretórios para Revisão (AVALIAR)

| Diretório | Conteúdo | Ação Sugerida |
|-----------|----------|---------------|
| archived_root/ | Arquivos antigos | MANTER (backup histórico) |
| backups/ | Backups manuais | LIMPAR se > 30 dias |
| tmp/ | Arquivos temporários | LIMPAR |
| playwright-report/ | Relatórios de teste | LIMPAR (regenerável) |
| test-results/ | Resultados de teste | LIMPAR (regenerável) |
| report/ | Relatórios gerados | VERIFICAR conteúdo |
| attached_assets/ | Assets anexados | VERIFICAR se em uso |

---

## 3. Duplicações Identificadas

### 3.1 Código Duplicado

| Local 1 | Local 2 | Tipo | Ação |
|---------|---------|------|------|
| sinan.tsx (AGRAVO_CID_MAP) | shared/sinan/agravos.ts | Dados | REMOVER de sinan.tsx |
| SinanDynamicForm.tsx | SinanTemplateSelector.tsx | Nenhuma | OK |

### 3.2 Arquivos Potencialmente Duplicados

| Arquivo | Verificar |
|---------|-----------|
| SINAN_SYNC_REPORT.md | Similar a ROOT_SCAN_REPORT.md? |
| CONSOLIDATION_REPORT.md | Ainda relevante? |

---

## 4. Plano de Limpeza

### 4.1 Tarefas SAFE (Podem ser executadas automaticamente)

| # | Tarefa | Risco | Estimativa |
|---|--------|-------|------------|
| S1 | Mover MDs antigos para archived_root/docs/ | NENHUM | 5min |
| S2 | Limpar tmp/ | NENHUM | 1min |
| S3 | Limpar playwright-report/ | NENHUM | 1min |
| S4 | Limpar test-results/ | NENHUM | 1min |
| S5 | Remover AGRAVO_CID_MAP de sinan.tsx | BAIXO | 15min |

### 4.2 Tarefas que Requerem Verificação

| # | Tarefa | Risco | Requer Aprovação |
|---|--------|-------|------------------|
| V1 | Verificar conteúdo de report/ | BAIXO | SIM |
| V2 | Verificar attached_assets/ em uso | BAIXO | SIM |
| V3 | Limpar backups/ > 30 dias | MÉDIO | SIM |

---

## 5. Estrutura Final Proposta

```
/
├── client/                    # Frontend React
│   └── src/
│       ├── components/
│       │   ├── sinan/        # Componentes SINAN
│       │   └── ui/           # shadcn components
│       └── pages/
│           ├── sinan.tsx
│           ├── social-assistance.tsx
│           └── pharmacy-*.tsx
├── server/                    # Backend Express
│   ├── services/
│   │   ├── sinan-template-service.ts
│   │   └── social-assistance-service.ts
│   └── routes.ts
├── shared/                    # Tipos compartilhados
│   ├── schema.ts             # Drizzle schema
│   └── sinan/
│       ├── templates/        # 20 arquivos de template
│       ├── agravos.ts
│       ├── registry.ts
│       └── template-types.ts
├── modules/                   # Automação
├── tests/                     # E2E tests
├── docs/                      # Documentação
├── archived_root/             # Arquivos históricos
│   └── docs/                  # MDs antigos
├── migrations/                # Drizzle migrations
├── scripts/                   # Scripts utilitários
├── replit.md                  # Documentação principal
├── design_guidelines.md       # Guidelines
└── [config files]             # Configs
```

---

## 6. Arquivos a Mover para archived_root/docs/

```bash
mv CLEANUP_LOG.md archived_root/docs/
mv CONSOLIDATION_REPORT.md archived_root/docs/
mv ROOT_SCAN_REPORT.md archived_root/docs/
# Após implementação:
mv SINAN_SYNC_PLAN.md archived_root/docs/
mv SINAN_SYNC_REPORT.md archived_root/docs/
```

---

## 7. Recomendações

1. **Imediato**: Limpar tmp/, playwright-report/, test-results/
2. **Após aprovação**: Mover MDs antigos para archived_root/docs/
3. **Verificar**: Conteúdo de report/ e attached_assets/
4. **Manter**: Todos os arquivos de configuração

---

*Relatório gerado em PLAN MODE - Tarefas S1-S5 são SAFE*
