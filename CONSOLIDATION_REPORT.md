# RELATORIO DE CONSOLIDACAO E OTIMIZACAO
## Sistema de Gestao em Saude Municipal

**Data:** 2025-12-06
**Status:** PLAN MODE - Aguardando aprovacao

---

## 1. FUNCIONALIDADES CONFIRMADAS (ATIVAS)

| Modulo | Rota | Arquivo | Status |
|--------|------|---------|--------|
| Dashboard | `/` | dashboard.tsx | ATIVO |
| Pacientes | `/pacientes`, `/pacientes/:id` | patients.tsx, patient-detail.tsx | ATIVO |
| Farmacia - Prescricoes | `/prescricoes` | prescriptions.tsx | ATIVO |
| Farmacia - Dispensacao | `/farmacia/dispensacao` | pharmacy-dispensation.tsx | ATIVO |
| Farmacia - Estoque | `/farmacia/estoque` | pharmacy-stock.tsx | ATIVO |
| Farmacia - Fraldas | `/farmacia/fraldas` | pharmacy-diaper-stock.tsx | ATIVO |
| TFD | `/tfd` | tfd.tsx | ATIVO |
| Assistencia Social | `/assistencia-social` | social-assistance.tsx | ATIVO |
| SINAN | `/sinan` | sinan.tsx | ATIVO |
| Relatorios | `/relatorios` | reports.tsx | ATIVO |
| Formularios | `/formularios` | automation/forms.tsx | ATIVO |
| Workflows | `/workflows` | automation/workflow.tsx | ATIVO |
| Alertas | `/alertas` | automation/alerts.tsx | ATIVO |
| Relatorios Estrategicos | `/relatorios-estrategicos` | automation/strategic-reports.tsx | ATIVO |
| Unidades | `/unidades` | units.tsx | ATIVO |
| Profissionais | `/profissionais` | professionals.tsx | ATIVO |
| Perfil | `/perfil` | profile.tsx | ATIVO |
| Configuracoes | `/configuracoes` | settings.tsx | ATIVO |

**Total: 18 modulos/paginas ativas**

---

## 2. CODIGO MORTO / NAO REFERENCIADO

### 2.1 Tabelas de Banco Nao Utilizadas

| Tabela | Linha Schema | Referencias | Recomendacao |
|--------|--------------|-------------|--------------|
| `editais` | 1453 | 0 | REMOVER (requer aprovacao) |

### 2.2 Dependencias npm Nao Utilizadas

| Pacote | Versao | Referencias | Economia |
|--------|--------|-------------|----------|
| `@neondatabase/serverless` | ^0.10.4 | 0 | ~200KB |
| `connect-pg-simple` | ^10.0.0 | 0 | ~50KB |
| `passport` | ^0.7.0 | 0 | ~100KB |
| `passport-local` | ^1.0.0 | 0 | ~20KB |
| `openid-client` | ^6.8.1 | 0 | ~150KB |
| `@types/connect-pg-simple` | dev | 0 | ~5KB |
| `@types/passport` | dev | 0 | ~5KB |
| `@types/passport-local` | dev | 0 | ~5KB |

**Economia estimada: ~535KB**

### 2.3 Scripts package.json Obsoletos

```json
"ace:lint": "tsc --noEmit modules/ace/server/**/*.ts modules/ace/client/**/*.ts",
"ace:test": "vitest run modules/ace/server/tests"
```

**Acao:** Remover (modulo ACE nao existe mais)

---

## 3. ANALISE DE PERFIS DE USUARIO

### Roles Atuais (8 roles)

| Role | Descricao | Modulos Permitidos |
|------|-----------|-------------------|
| `admin` | Administrador | TODOS |
| `medico` | Medico(a) | Dashboard, Pacientes, Prescricoes, Relatorios |
| `enfermeiro` | Enfermeiro(a) | Dashboard, Pacientes, Prescricoes, Relatorios |
| `acs` | Agente Comunitario | Dashboard, Pacientes |
| `farmaceutico` | Farmaceutico(a) | Dashboard, Farmacia (todos), Relatorios |
| `gestor` | Gestor(a) | Dashboard, Relatorios, Automacao, TFD |
| `recepcao` | Recepcionista | Dashboard, Pacientes |
| `assistencia_social` | Assistente Social | Dashboard, Assistencia Social, Relatorios |

**Status:** Roles adequados para funcionalidades atuais. Nenhuma alteracao necessaria.

---

## 4. PLANO DE OTIMIZACAO

### 4.1 Remocoes Seguras (Automaticas)

| Item | Tipo | Acao |
|------|------|------|
| Scripts ace:lint, ace:test | package.json | REMOVER |
| Dependencias npm nao usadas | package.json | REMOVER (apos aprovacao) |
| Imports nao utilizados | Codigo | LIMPAR |

### 4.2 Remocoes que Requerem Aprovacao

| Item | Tipo | Risco | Acao |
|------|------|-------|------|
| Tabela `editais` | Schema/DB | MEDIO | Aguardar aprovacao |
| Dependencias npm | package.json | BAIXO | Aguardar aprovacao |

---

## 5. LOGO ARGO TECH BRASIL

### Arquivo Recebido
- **Path:** `attached_assets/logo_1765036880573.png`
- **Dimensoes:** 1024x360 (estimado)
- **Formato:** PNG com transparencia

### Plano de Insercao
1. Otimizar imagem (comprimir sem perda de qualidade)
2. Inserir no footer da sidebar (discreto)
3. Manter proporcoes originais
4. Adicionar alt text para acessibilidade

---

## 6. SUGESTOES DE NOME

Com base nas funcionalidades mantidas (Saude Municipal, Farmacia, TFD, Assistencia Social, SINAN, Automacao), sugiro:

### Opcao 1: **ArgoSaude**
- Curto, profissional
- Associa a marca Argo Tech Brasil
- Facil de lembrar

### Opcao 2: **ArgoGestao Saude**
- Enfatiza gestao integrada
- Profissional e descritivo

### Opcao 3: **MuniSaude by Argo** (manter nome atual)
- Ja estabelecido
- Apenas adicionar marca Argo

**Recomendacao:** **ArgoSaude** - curto, memoravel, profissional.

---

## 7. METRICAS DO PROJETO

| Metrica | Valor |
|---------|-------|
| Arquivos TS/TSX | 162 |
| Linhas de codigo | 55.542 |
| Tabelas de banco | 44 |
| Endpoints API | ~100+ |
| Paginas frontend | 18 |
| Templates SINAN | 108 unicos |
| Roles de usuario | 8 |

---

## 8. CHECKLIST DE EXECUCAO

### Fase 1: Limpeza Segura (AUTOMATICO)
- [ ] Remover scripts ace:* do package.json
- [ ] Limpar imports nao utilizados
- [ ] Otimizar logo e inserir no footer

### Fase 2: Remocao de Dependencias (REQUER APROVACAO)
- [ ] Remover @neondatabase/serverless
- [ ] Remover connect-pg-simple
- [ ] Remover passport, passport-local
- [ ] Remover openid-client
- [ ] Remover @types associados

### Fase 3: Schema/Banco (REQUER APROVACAO)
- [ ] Remover tabela `editais` do schema
- [ ] Executar db:push

### Fase 4: Renomeacao (REQUER APROVACAO)
- [ ] Aplicar novo nome escolhido
- [ ] Atualizar branding

---

## 9. PONTOS QUE EXIGEM APROVACAO

| ID | Item | Tipo | Risco |
|----|------|------|-------|
| A1 | Remover 5 dependencias npm | Destrutivo | BAIXO |
| A2 | Remover tabela editais | Destrutivo | MEDIO |
| A3 | Aplicar novo nome do sistema | Irreversivel | BAIXO |

---

## PROXIMOS PASSOS

Aguardo sua aprovacao para:

1. **Aprovar remocao de dependencias npm nao utilizadas?** (SIM/NAO)
2. **Aprovar remocao da tabela `editais` do schema?** (SIM/NAO)
3. **Qual nome escolhido?** (ArgoSaude / ArgoGestao Saude / MuniSaude by Argo / Outro)

Apos aprovacao, executarei todas as acoes de forma incremental com checkpoints.
