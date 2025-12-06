# ASSETS REPORT - MuniSaude Integrado

## Data: 2025-12-06 04:24 UTC

---

## Resumo Geral

| Tipo | Quantidade | Tamanho Total |
|------|------------|---------------|
| PNG (Screenshots) | 32 | 32 MB |
| PDF (Manuais) | 20 | 10 MB |
| TXT (Prompts) | 40 | 396 KB |
| ZIP (Arquivos) | 1 | 21 MB |
| **TOTAL** | **93** | **63 MB** |

---

## Analise por Categoria

### 1. PNGs - Screenshots (32 arquivos, 32MB)

**Arquivos Recentes (Dec 5, 2025)** - MANTER em attached_assets/:
| Arquivo | Tamanho | Data |
|---------|---------|------|
| Captura_de_Tela_2025-12-05_as_10.46.08_1764942387448.png | 729 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_10.28.08_1764941343299.png | 744 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_10.25.59_1764941343299.png | 754 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_10.09.37_1764940270357.png | 914 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_10.08.16_1764940113092.png | 842 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_09.43.18_1764938618116.png | 709 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_09.40.44_1764938480603.png | 746 KB | Dec 5 |
| Captura_de_Tela_2025-12-05_as_09.39.15_1764938364743.png | 776 KB | Dec 5 |

**Arquivos Antigos (Nov 2025 e anteriores)** - ARQUIVAR:
- 24 screenshots de Nov 16-26, 2025
- Tamanho total: ~26 MB
- Destino: archived_assets/screenshots/

**Criterio de Arquivamento**: Screenshots com mais de 7 dias serao arquivados.

---

### 2. PDFs - Manuais e Documentacao (20 arquivos, 10MB)

**Documentacao Tecnica SUS (ARQUIVAR em docs/)**:
| Arquivo | Tamanho | Descricao |
|---------|---------|-----------|
| Manual_de_instalacao_SinanNet_V_5.0_*.pdf | 5.5 MB | Manual SINAN oficial |
| Manual_Operacional_BPA_*.pdf | 1.1 MB x2 | Manual BPA (duplicado) |
| Manual_SINAN_Normas_e_Rotinas_*.pdf | 629 KB | Normas SINAN |
| Layout_Exportacao_APAC_*.pdf | 415 KB x2 | Layout APAC (duplicado) |
| Layout_Exportacao_BPA_*.pdf | 164 KB x2 | Layout BPA (duplicado) |
| Formulario_BPA_I_*.pdf | 118 KB x2 | Formulario BPA-I (duplicado) |
| Formulario_APAC_LAUDO_*.pdf | 114 KB x2 | Formulario APAC (duplicado) |
| Formulario_BPA_C_*.pdf | 32 KB x2 | Formulario BPA-C (duplicado) |

**Documentacao do Projeto (MANTER em docs/)**:
| Arquivo | Tamanho | Descricao |
|---------|---------|-----------|
| DOSSIER_CPSI_Cardeal_da_Silva_*.pdf | 17 KB | Dossie do projeto |
| Roteiro_Tecnico_eSUS_APS_*.pdf | 9.5 KB | Roteiro tecnico |
| Roteiro_Modulo_TFD_*.pdf | 5.3 KB x3 | Roteiro TFD (triplicado) |
| PEC_Integrado_SaaS_Municipal_*.pdf | 4.6 KB | Especificacao PEC |

**Duplicados Identificados**:
- Manual_Operacional_BPA: 2 copias (manter 1)
- Layout_Exportacao_APAC: 2 copias (manter 1)
- Layout_Exportacao_BPA: 2 copias (manter 1)
- Formulario_BPA_I: 2 copias (manter 1)
- Formulario_APAC_LAUDO: 2 copias (manter 1)
- Formulario_BPA_C: 2 copias (manter 1)
- Roteiro_Modulo_TFD: 3 copias (manter 1)

---

### 3. TXTs - Prompts e Textos (40 arquivos, 396KB)

**Categorias Identificadas**:
- Prompts de desenvolvimento (Pasted-*.txt): 38 arquivos
- Relatorios tecnicos: 2 arquivos

**Acao**: Todos serao arquivados em archived_assets/txts/ com indice txt_index.csv

---

### 4. ZIPs (1 arquivo, 21MB)

| Arquivo | Tamanho | Status |
|---------|---------|--------|
| FICHAS_1764946781614.zip | 21 MB | MANTER (fichas SINAN) |

**Nota**: ZIP duplicado (FICHAS_1764940456321.zip) foi removido na sessao anterior.

---

## Plano de Acao

### Fase 1: Arquivar Screenshots Antigos
- Mover 24 PNGs de Nov 2025 para archived_assets/screenshots/
- Manter 8 PNGs recentes (Dec 2025) em attached_assets/

### Fase 2: Organizar PDFs
- Mover documentacao tecnica SUS para docs/
- Remover duplicados (manter versao mais recente)
- Mover PDFs do projeto para docs/

### Fase 3: Arquivar TXTs
- Mover todos 40 TXTs para archived_assets/txts/
- Gerar txt_index.csv com metadados

### Fase 4: Manter ZIP
- FICHAS_1764946781614.zip permanece em attached_assets/

---

## Economia Estimada

| Acao | Espaco Liberado |
|------|-----------------|
| Arquivar PNGs antigos | ~26 MB |
| Remover PDFs duplicados | ~3 MB |
| Arquivar TXTs | ~400 KB |
| **TOTAL** | **~29.4 MB** |

---

## Proximos Passos

1. Executar movimentacao conforme plano
2. Gerar RELATO_ASSETS.md
3. Validar referencias no codigo
4. Perguntar sobre delecao permanente
