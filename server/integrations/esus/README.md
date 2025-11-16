# Integração e-SUS APS

Este módulo contém a integração com o sistema e-SUS APS (Atenção Primária à Saúde) do Ministério da Saúde.

## Objetivo

Exportar dados do sistema PEC Integrado Municipal para o formato exigido pelo e-SUS APS, garantindo conformidade com os padrões estabelecidos pelo DATASUS.

## Estrutura

```
esus/
├── README.md           # Este arquivo
├── exporters/          # Classes de exportação por tipo de dado
├── validators/         # Validadores Zod para estruturas e-SUS
├── formatters/         # Formatadores de dados para XML/JSON
└── __tests__/          # Testes unitários
```

## Dependências

- `zod`: Validação de esquemas
- `fast-xml-parser`: Conversão XML
- `dayjs`: Manipulação de datas
- `vitest`: Framework de testes

## Status

🚧 Em desenvolvimento - Branch: feature/esus-exporter
