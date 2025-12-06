# ROOT SCAN REPORT - ArgoSaude v2.0.0

**Data:** 2025-12-06 16:17 UTC
**Status:** CONCLUIDO

---

## 1. ARQUIVOS NA RAIZ (POS-LIMPEZA)

### Arquivos de Configuracao
| Arquivo | Tamanho | Status |
|---------|---------|--------|
| package.json | 4KB | ATIVO |
| package-lock.json | 336KB | ATIVO |
| tsconfig.json | 1KB | ATIVO |
| vite.config.ts | 1KB | ATIVO |
| vitest.config.ts | 1KB | ATIVO |
| tailwind.config.ts | 4KB | ATIVO |
| postcss.config.js | 1KB | ATIVO |
| drizzle.config.ts | 1KB | ATIVO |
| playwright.config.ts | 1KB | ATIVO |
| components.json | 1KB | ATIVO |
| .gitignore | 1KB | ATIVO |
| .replit | 1KB | ATIVO |

### Arquivos de Documentacao
| Arquivo | Tamanho | Status | Referenciado |
|---------|---------|--------|--------------|
| replit.md | 6KB | ATIVO | NAO (metadoc) |
| CONSOLIDATION_REPORT.md | 5KB | ATIVO | NAO (metadoc) |
| CLEANUP_LOG.md | 7KB | ATIVO | NAO (log) |
| design_guidelines.md | 6KB | ATIVO | NAO (design) |

### Banco de Dados
| Arquivo | Tamanho | Status |
|---------|---------|--------|
| saude.db | 632KB | ATIVO |
| saude.db-wal | 4MB | ATIVO (WAL) |
| saude.db-shm | 32KB | ATIVO (SHM) |

---

## 2. DIRETORIOS NA RAIZ

| Diretorio | Tamanho | Arquivos | Status |
|-----------|---------|----------|--------|
| node_modules/ | 492MB | ~10k | ATIVO |
| attached_assets/ | 29MB | 4 | ATIVO |
| client/ | 3.6MB | ~80 | ATIVO |
| server/ | 416KB | ~15 | ATIVO |
| shared/ | 588KB | ~30 | ATIVO |
| docs/ | 2.6MB | 13 | ATIVO |
| modules/ | 208KB | ~10 | ATIVO |
| migrations/ | 100KB | ~5 | ATIVO |
| backups/ | 632KB | 1 | ATIVO |
| archived_root/ | 6.2MB | ~15 | ARQUIVADO |
| tests/ | 60KB | ~3 | ATIVO |
| playwright-report/ | 512KB | ~10 | ATIVO |
| test-results/ | 4KB | ~2 | ATIVO |
| scripts/ | 4KB | ~2 | ATIVO |
| report/ | 4KB | ~1 | ATIVO |

---

## 3. ARQUIVOS MOVIDOS (ESTA SESSAO)

| Arquivo | Origem | Destino | Motivo |
|---------|--------|---------|--------|
| RELATORIO_PRODUCAO_MUNIS AUDE.md | raiz | archived_root/docs/ | Marketing antigo MuniSaude |
| RELATORIO_TECNICO_MUNISAUDE.md | raiz | archived_root/docs/ | Docs tecnico antigo |
| RELATO_ASSETS.md | raiz | archived_root/docs/ | Relatorio obsoleto |
| ASSETS_REPORT.md | raiz | archived_root/docs/ | Relatorio obsoleto |
| 9x Captura_de_Tela_*.png | attached_assets | archived_root/screenshots/ | Screenshots antigos |
| 2x Pasted--*.txt | attached_assets | archived_root/docs/ | Prompts arquivados |

---

## 4. ATTACHED_ASSETS (POS-LIMPEZA)

| Arquivo | Tamanho | Status | Acao Recomendada |
|---------|---------|--------|------------------|
| FICHAS_1764946781614.zip | 21MB | ATIVO | MANTER (templates SINAN) |
| logo_1765036880573.png | 2.7MB | ATIVO | OTIMIZAR (muito grande) |
| Manual_SINAN*.pdf | 5.5MB | ATIVO | MOVER para docs/ |
| generated_images/ | ~5MB | ATIVO | MANTER |

---

## 5. ITENS QUE REQUEREM APROVACAO

### 5.1 Otimizacao de Logo
- **Arquivo:** attached_assets/logo_1765036880573.png
- **Tamanho atual:** 2.7MB
- **Tamanho recomendado:** ~100KB
- **Acao:** Comprimir sem perda de qualidade
- **Risco:** BAIXO

### 5.2 Mover Manual SINAN
- **Arquivo:** attached_assets/Manual_SINAN*.pdf
- **Destino:** docs/
- **Acao:** Consolidar documentacao tecnica
- **Risco:** BAIXO

### 5.3 Remover design_guidelines.md
- **Arquivo:** design_guidelines.md
- **Referencias:** 0 no codigo
- **Acao:** Mover para archived_root/docs/
- **Risco:** BAIXO

---

## 6. METRICAS FINAIS

| Metrica | Valor Antes | Valor Depois |
|---------|-------------|--------------|
| Arquivos .md na raiz | 8 | 4 |
| Screenshots em attached | 9 | 0 |
| Arquivos arquivados | 0 | 15 |
| Espaco arquivado | 0 | 6.2MB |

---

## 7. COMANDOS DE ROLLBACK

```bash
# Restaurar todos os arquivos
mv archived_root/docs/*.md .
mv archived_root/screenshots/* attached_assets/
mv archived_root/docs/*.txt attached_assets/
rmdir archived_root/{docs,screenshots,assets}
rmdir archived_root
```

---

## 8. PROXIMOS PASSOS

1. [OPCIONAL] Otimizar logo (2.7MB -> ~100KB)
2. [OPCIONAL] Mover Manual SINAN para docs/
3. [OPCIONAL] Arquivar design_guidelines.md
4. [RECOMENDADO] Executar testes: `npm test`
5. [RECOMENDADO] Build de producao: `npm run build`

---

**ArgoSaude v2.0.0** - Argo Tech Brasil
