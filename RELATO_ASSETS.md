# RELATO DE ARQUIVAMENTO DE ASSETS

## Data: 2025-12-06 04:25 UTC

---

## Resumo da Operacao

| Acao | Quantidade | Tamanho |
|------|------------|---------|
| Arquivos mantidos em attached_assets/ | 11 | 37 MB |
| Arquivos movidos para archived_assets/ | 69 | 24 MB |
| Arquivos movidos para docs/ | 11 | ~8 MB |
| **TOTAL PROCESSADO** | **91** | **~69 MB** |

---

## Detalhamento por Categoria

### 1. Screenshots (PNGs)

**Mantidos em attached_assets/ (8 arquivos, ~6 MB)**:
- Captura_de_Tela_2025-12-05_as_09.39.15_1764938364743.png
- Captura_de_Tela_2025-12-05_as_09.40.44_1764938480603.png
- Captura_de_Tela_2025-12-05_as_09.43.18_1764938618116.png
- Captura_de_Tela_2025-12-05_as_10.08.16_1764940113092.png
- Captura_de_Tela_2025-12-05_as_10.09.37_1764940270357.png
- Captura_de_Tela_2025-12-05_as_10.25.59_1764941343299.png
- Captura_de_Tela_2025-12-05_as_10.28.08_1764941343299.png
- Captura_de_Tela_2025-12-05_as_10.46.08_1764942387448.png

**Arquivados em archived_assets/screenshots/ (20 arquivos, ~26 MB)**:
- Screenshots de Nov 16-26, 2025
- Criterio: Screenshots com mais de 7 dias

---

### 2. Documentacao (PDFs)

**Movidos para docs/ (11 arquivos)**:
- Manual_de_instalacao_SinanNet_V_5.0_*.pdf (5.5 MB)
- Manual_Operacional_BPA_1764701846099.pdf (1.1 MB)
- Manual_SINAN_Normas_e_Rotinas_*.pdf (629 KB)
- Layout_Exportacao_APAC_1764701846099.pdf (415 KB)
- Layout_Exportacao_BPA_1764701846099.pdf (164 KB)
- Formulario_BPA_I_1764701846099.pdf (118 KB)
- Formulario_APAC_LAUDO_1764701846098.pdf (114 KB)
- Formulario_BPA_C_1764701846098.pdf (32 KB)
- DOSSIER_CPSI_Cardeal_da_Silva_*.pdf (17 KB)
- Roteiro_Tecnico_eSUS_APS_*.pdf (9.5 KB)
- Roteiro_Modulo_TFD_Saude_Municipal_*.pdf (5.3 KB)

**Arquivados em archived_assets/pdfs/ (8 arquivos duplicados)**:
- Manual_Operacional_BPA_1764698372821.pdf (duplicado)
- Layout_Exportacao_APAC_1764698372820.pdf (duplicado)
- Layout_Exportacao_BPA_1764698372821.pdf (duplicado)
- Formulario_BPA_I_1764698372820.pdf (duplicado)
- Formulario_APAC_LAUDO_1764698372819.pdf (duplicado)
- Formulario_BPA_C_1764698372820.pdf (duplicado)
- Roteiro_Modulo_TFD_Saude_Municipal (1)_1762384543977.pdf (duplicado)
- Roteiro_Modulo_TFD_Saude_Municipal (1)_1762384737103.pdf (duplicado)

---

### 3. Prompts e Textos (TXTs)

**Arquivados em archived_assets/txts/ (40 arquivos, 396 KB)**:
- Todos os arquivos Pasted-*.txt
- Indice gerado: archived_assets/txts/txt_index.csv

---

### 4. Arquivos ZIP

**Mantido em attached_assets/ (1 arquivo, 21 MB)**:
- FICHAS_1764946781614.zip (fichas SINAN oficiais)

**Removido anteriormente**:
- FICHAS_1764940456321.zip (duplicado - removido em sessao anterior)

---

## Estrutura Final

```
attached_assets/
├── 8x Captura_de_Tela_2025-12-05_*.png (screenshots recentes)
├── FICHAS_1764946781614.zip (fichas SINAN)
├── Manual_de_instalacao_SinanNet_V_5.0_*.pdf (manual principal)
└── generated_images/ (imagens geradas pelo sistema)

archived_assets/
├── screenshots/ (20 PNGs antigos)
├── pdfs/ (8 PDFs duplicados)
├── txts/ (40 TXTs + txt_index.csv)
└── docs/ (vazio - PDFs foram para /docs)

docs/
└── 11 PDFs (documentacao tecnica SUS e projeto)
```

---

## Instrucoes de Restauracao

### Restaurar arquivo individual:
```bash
# Restaurar screenshot especifico
mv archived_assets/screenshots/<filename>.png attached_assets/

# Restaurar PDF duplicado
mv archived_assets/pdfs/<filename>.pdf attached_assets/

# Restaurar TXT especifico
mv archived_assets/txts/<filename>.txt attached_assets/
```

### Restaurar categoria completa:
```bash
# Restaurar todos os screenshots
mv archived_assets/screenshots/*.png attached_assets/

# Restaurar todos os PDFs
mv archived_assets/pdfs/*.pdf attached_assets/

# Restaurar todos os TXTs
mv archived_assets/txts/*.txt attached_assets/
```

### Restaurar tudo (rollback completo):
```bash
mv archived_assets/screenshots/*.png attached_assets/
mv archived_assets/pdfs/*.pdf attached_assets/
mv archived_assets/txts/*.txt attached_assets/
```

---

## Validacao

| Verificacao | Status |
|-------------|--------|
| Arquivos movidos corretamente | OK |
| Indices gerados | OK |
| Estrutura de pastas criada | OK |
| Sistema funcionando | OK |

---

## Acao Final

**DELECAO PERMANENTE EXECUTADA**: 2025-12-06 04:28 UTC

O proprietario autorizou a delecao permanente dos assets arquivados.

| Acao | Resultado |
|------|-----------|
| `rm -rf archived_assets/` | Executado com sucesso |
| Espaco liberado | 24 MB |

**Estado Final do Projeto**:
- `attached_assets/`: 37 MB (8 PNGs recentes + 1 ZIP + 1 PDF)
- `docs/`: 2.6 MB (11 PDFs de documentacao tecnica)
- `archived_assets/`: REMOVIDO
