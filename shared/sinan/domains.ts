export const SINAN_SEXO = [
  { value: "M", label: "Masculino", codigo: "1" },
  { value: "F", label: "Feminino", codigo: "2" },
  { value: "I", label: "Ignorado", codigo: "9" },
] as const;

export const SINAN_RACA_COR = [
  { value: "1", label: "Branca" },
  { value: "2", label: "Preta" },
  { value: "3", label: "Amarela" },
  { value: "4", label: "Parda" },
  { value: "5", label: "Indígena" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_ESCOLARIDADE = [
  { value: "0", label: "Analfabeto" },
  { value: "1", label: "1ª a 4ª série incompleta do EF" },
  { value: "2", label: "4ª série completa do EF" },
  { value: "3", label: "5ª a 8ª série incompleta do EF" },
  { value: "4", label: "Ensino fundamental completo" },
  { value: "5", label: "Ensino médio incompleto" },
  { value: "6", label: "Ensino médio completo" },
  { value: "7", label: "Educação superior incompleta" },
  { value: "8", label: "Educação superior completa" },
  { value: "9", label: "Ignorado" },
  { value: "10", label: "Não se aplica" },
] as const;

export const SINAN_GESTANTE = [
  { value: "1", label: "1º Trimestre" },
  { value: "2", label: "2º Trimestre" },
  { value: "3", label: "3º Trimestre" },
  { value: "4", label: "Idade gestacional ignorada" },
  { value: "5", label: "Não" },
  { value: "6", label: "Não se aplica" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_ZONA = [
  { value: "1", label: "Urbana" },
  { value: "2", label: "Rural" },
  { value: "3", label: "Periurbana" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_TIPO_NOTIFICACAO = [
  { value: "1", label: "Individual" },
  { value: "2", label: "Surto" },
  { value: "3", label: "Agregado" },
] as const;

export const SINAN_SIM_NAO_IGNORADO = [
  { value: "1", label: "Sim" },
  { value: "2", label: "Não" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_SIM_NAO = [
  { value: "1", label: "Sim" },
  { value: "2", label: "Não" },
] as const;

export const SINAN_EVOLUCAO = [
  { value: "1", label: "Cura" },
  { value: "2", label: "Óbito pelo agravo notificado" },
  { value: "3", label: "Óbito por outras causas" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_EVOLUCAO_ESTENDIDA = [
  { value: "1", label: "Cura" },
  { value: "2", label: "Cura com sequela" },
  { value: "3", label: "Óbito pelo agravo notificado" },
  { value: "4", label: "Óbito por outras causas" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_CRITERIO_CONFIRMACAO = [
  { value: "1", label: "Laboratorial" },
  { value: "2", label: "Clínico-epidemiológico" },
  { value: "3", label: "Em investigação" },
] as const;

export const SINAN_CLASSIFICACAO_FINAL = [
  { value: "1", label: "Confirmado" },
  { value: "2", label: "Descartado" },
  { value: "8", label: "Inconclusivo" },
] as const;

export const SINAN_IDADE_TIPO = [
  { value: "1", label: "Hora" },
  { value: "2", label: "Dia" },
  { value: "3", label: "Mês" },
  { value: "4", label: "Ano" },
] as const;

export const SINAN_EXAME_RESULTADO = [
  { value: "1", label: "Positivo/Reagente" },
  { value: "2", label: "Negativo/Não reagente" },
  { value: "3", label: "Inconclusivo" },
  { value: "4", label: "Não realizado" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_PAIS = [
  { value: "1", label: "Brasil" },
  { value: "2", label: "Outro país" },
] as const;

export const SINAN_UFS = [
  { value: "AC", label: "Acre", ibge: "12" },
  { value: "AL", label: "Alagoas", ibge: "27" },
  { value: "AP", label: "Amapá", ibge: "16" },
  { value: "AM", label: "Amazonas", ibge: "13" },
  { value: "BA", label: "Bahia", ibge: "29" },
  { value: "CE", label: "Ceará", ibge: "23" },
  { value: "DF", label: "Distrito Federal", ibge: "53" },
  { value: "ES", label: "Espírito Santo", ibge: "32" },
  { value: "GO", label: "Goiás", ibge: "52" },
  { value: "MA", label: "Maranhão", ibge: "21" },
  { value: "MT", label: "Mato Grosso", ibge: "51" },
  { value: "MS", label: "Mato Grosso do Sul", ibge: "50" },
  { value: "MG", label: "Minas Gerais", ibge: "31" },
  { value: "PA", label: "Pará", ibge: "15" },
  { value: "PB", label: "Paraíba", ibge: "25" },
  { value: "PR", label: "Paraná", ibge: "41" },
  { value: "PE", label: "Pernambuco", ibge: "26" },
  { value: "PI", label: "Piauí", ibge: "22" },
  { value: "RJ", label: "Rio de Janeiro", ibge: "33" },
  { value: "RN", label: "Rio Grande do Norte", ibge: "24" },
  { value: "RS", label: "Rio Grande do Sul", ibge: "43" },
  { value: "RO", label: "Rondônia", ibge: "11" },
  { value: "RR", label: "Roraima", ibge: "14" },
  { value: "SC", label: "Santa Catarina", ibge: "42" },
  { value: "SP", label: "São Paulo", ibge: "35" },
  { value: "SE", label: "Sergipe", ibge: "28" },
  { value: "TO", label: "Tocantins", ibge: "17" },
] as const;

export const SINAN_STATUS_NOTIFICACAO = [
  { value: "rascunho", label: "Rascunho" },
  { value: "preenchida", label: "Preenchida" },
  { value: "validada", label: "Validada" },
  { value: "exportada", label: "Exportada" },
  { value: "digitado_sinan", label: "Digitado no SINAN" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export const SINAN_VACINACAO_STATUS = [
  { value: "1", label: "Vacinado (3+ doses)" },
  { value: "2", label: "Vacinado (1-2 doses)" },
  { value: "3", label: "Não vacinado" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_TIPO_ENTRADA_TB = [
  { value: "1", label: "Caso novo" },
  { value: "2", label: "Recidiva" },
  { value: "3", label: "Reingresso após abandono" },
  { value: "4", label: "Não sabe" },
  { value: "5", label: "Transferência" },
  { value: "6", label: "Pós-óbito" },
] as const;

export const SINAN_FORMA_TB = [
  { value: "1", label: "Pulmonar" },
  { value: "2", label: "Extrapulmonar" },
  { value: "3", label: "Pulmonar + Extrapulmonar" },
] as const;

export const SINAN_SITUACAO_ENCERRAMENTO_TB = [
  { value: "1", label: "Cura" },
  { value: "2", label: "Abandono" },
  { value: "3", label: "Óbito por tuberculose" },
  { value: "4", label: "Óbito por outras causas" },
  { value: "5", label: "Transferência" },
  { value: "6", label: "TB-DR" },
  { value: "7", label: "Mudança de esquema" },
  { value: "8", label: "Falência" },
  { value: "9", label: "Abandono primário" },
] as const;

export const SINAN_CLASSIFICACAO_OPERACIONAL_HANSENIASE = [
  { value: "1", label: "Paucibacilar (PB)" },
  { value: "2", label: "Multibacilar (MB)" },
] as const;

export const SINAN_FORMA_CLINICA_HANSENIASE = [
  { value: "1", label: "Indeterminada" },
  { value: "2", label: "Tuberculóide" },
  { value: "3", label: "Dimorfa" },
  { value: "4", label: "Virchowiana" },
  { value: "5", label: "Não classificada" },
] as const;

export const SINAN_MODO_ENTRADA_HANSENIASE = [
  { value: "1", label: "Caso novo" },
  { value: "2", label: "Transferência do mesmo município" },
  { value: "3", label: "Transferência de outro município" },
  { value: "4", label: "Transferência de outro estado" },
  { value: "5", label: "Transferência de outro país" },
  { value: "6", label: "Recidiva" },
  { value: "7", label: "Outro reingresso" },
] as const;

export const SINAN_CLASSIFICACAO_DENGUE = [
  { value: "1", label: "Dengue" },
  { value: "2", label: "Dengue com sinais de alarme" },
  { value: "3", label: "Dengue grave" },
  { value: "5", label: "Descartado" },
  { value: "8", label: "Inconclusivo" },
] as const;

export const SINAN_SOROTIPO_DENGUE = [
  { value: "1", label: "DENV-1" },
  { value: "2", label: "DENV-2" },
  { value: "3", label: "DENV-3" },
  { value: "4", label: "DENV-4" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_ETIOLOGIA_MENINGITE = [
  { value: "1", label: "Meningocócica" },
  { value: "2", label: "Pneumocócica" },
  { value: "3", label: "Haemophilus" },
  { value: "4", label: "Tuberculosa" },
  { value: "5", label: "Viral" },
  { value: "6", label: "Outras bactérias" },
  { value: "7", label: "Não especificada" },
  { value: "8", label: "Outra etiologia" },
  { value: "9", label: "Ignorada" },
] as const;

export const SINAN_TIPO_HEPATITE = [
  { value: "A", label: "Hepatite A" },
  { value: "B", label: "Hepatite B" },
  { value: "C", label: "Hepatite C" },
  { value: "D", label: "Hepatite D" },
  { value: "E", label: "Hepatite E" },
  { value: "B+D", label: "Hepatite B + D" },
] as const;

export const SINAN_FORMA_CLINICA_HEPATITE = [
  { value: "1", label: "Hepatite aguda" },
  { value: "2", label: "Hepatite crônica/portador assintomático" },
  { value: "3", label: "Hepatite fulminante" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_FONTE_INFECCAO_HEPATITE = [
  { value: "1", label: "Sexual" },
  { value: "2", label: "Transfusional" },
  { value: "3", label: "Uso de drogas" },
  { value: "4", label: "Vertical" },
  { value: "5", label: "Acidente de trabalho" },
  { value: "6", label: "Hemodiálise" },
  { value: "7", label: "Domiciliar" },
  { value: "8", label: "Tratamento cirúrgico/dentário" },
  { value: "9", label: "Pessoa/pessoa" },
  { value: "10", label: "Alimento/água" },
  { value: "11", label: "Outros" },
  { value: "99", label: "Ignorado" },
] as const;

export const SINAN_TIPO_SIFILIS = [
  { value: "1", label: "Sífilis primária" },
  { value: "2", label: "Sífilis secundária" },
  { value: "3", label: "Sífilis terciária" },
  { value: "4", label: "Sífilis latente" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_ESQUEMA_TRATAMENTO_SIFILIS = [
  { value: "1", label: "Penicilina G benzatina 2.400.000 UI" },
  { value: "2", label: "Penicilina G benzatina 4.800.000 UI" },
  { value: "3", label: "Penicilina G benzatina 7.200.000 UI" },
  { value: "4", label: "Outro esquema" },
  { value: "5", label: "Não realizado" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_CATEGORIA_EXPOSICAO_HIV = [
  { value: "1", label: "Heterossexual" },
  { value: "2", label: "Homossexual" },
  { value: "3", label: "Bissexual" },
  { value: "4", label: "UDI" },
  { value: "5", label: "Transfusão" },
  { value: "6", label: "Acidente com material biológico" },
  { value: "7", label: "Transmissão vertical" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_TIPO_VIOLENCIA = [
  { value: "1", label: "Física" },
  { value: "2", label: "Psicológica/Moral" },
  { value: "3", label: "Tortura" },
  { value: "4", label: "Sexual" },
  { value: "5", label: "Tráfico de seres humanos" },
  { value: "6", label: "Financeira/Econômica" },
  { value: "7", label: "Negligência/Abandono" },
  { value: "8", label: "Trabalho infantil" },
  { value: "9", label: "Intervenção legal" },
  { value: "10", label: "Outros" },
] as const;

export const SINAN_LOCAL_OCORRENCIA_VIOLENCIA = [
  { value: "1", label: "Residência" },
  { value: "2", label: "Habitação coletiva" },
  { value: "3", label: "Escola" },
  { value: "4", label: "Local de prática esportiva" },
  { value: "5", label: "Bar ou similar" },
  { value: "6", label: "Via pública" },
  { value: "7", label: "Comércio/Serviços" },
  { value: "8", label: "Indústrias/Construção" },
  { value: "9", label: "Outro" },
  { value: "99", label: "Ignorado" },
] as const;

export const SINAN_AUTOR_AGRESSAO = [
  { value: "1", label: "Pai" },
  { value: "2", label: "Mãe" },
  { value: "3", label: "Padrasto" },
  { value: "4", label: "Madrasta" },
  { value: "5", label: "Cônjuge" },
  { value: "6", label: "Ex-cônjuge" },
  { value: "7", label: "Namorado(a)" },
  { value: "8", label: "Ex-namorado(a)" },
  { value: "9", label: "Filho(a)" },
  { value: "10", label: "Irmão(ã)" },
  { value: "11", label: "Amigos/Conhecidos" },
  { value: "12", label: "Desconhecido" },
  { value: "13", label: "Patrão/Chefe" },
  { value: "14", label: "Pessoa com relação institucional" },
  { value: "15", label: "Policial/Agente da lei" },
  { value: "16", label: "Própria pessoa" },
  { value: "17", label: "Outros" },
] as const;

export const SINAN_TIPO_ACIDENTE_TRABALHO = [
  { value: "1", label: "Típico" },
  { value: "2", label: "Trajeto" },
  { value: "3", label: "Doença do trabalho" },
] as const;

export const SINAN_PARTE_CORPO_ATINGIDA = [
  { value: "1", label: "Cabeça" },
  { value: "2", label: "Olho" },
  { value: "3", label: "Pescoço" },
  { value: "4", label: "Tórax" },
  { value: "5", label: "Abdome" },
  { value: "6", label: "Mão" },
  { value: "7", label: "Membro superior" },
  { value: "8", label: "Membro inferior" },
  { value: "9", label: "Pé" },
  { value: "10", label: "Múltiplas localizações" },
  { value: "11", label: "Todo o corpo" },
  { value: "99", label: "Ignorado" },
] as const;

export const SINAN_TIPO_INTOXICACAO = [
  { value: "1", label: "Aguda-única" },
  { value: "2", label: "Aguda-repetida" },
  { value: "3", label: "Crônica" },
  { value: "4", label: "Aguda sobre crônica" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_AGENTE_TOXICO = [
  { value: "1", label: "Medicamento" },
  { value: "2", label: "Agrotóxico agrícola" },
  { value: "3", label: "Agrotóxico doméstico" },
  { value: "4", label: "Agrotóxico saúde pública" },
  { value: "5", label: "Raticida" },
  { value: "6", label: "Produto veterinário" },
  { value: "7", label: "Produto uso domiciliar" },
  { value: "8", label: "Cosmético" },
  { value: "9", label: "Produto químico industrial" },
  { value: "10", label: "Metal" },
  { value: "11", label: "Drogas de abuso" },
  { value: "12", label: "Planta tóxica" },
  { value: "13", label: "Alimento e bebida" },
  { value: "14", label: "Outro" },
  { value: "99", label: "Ignorado" },
] as const;

export const SINAN_CIRCUNSTANCIA_INTOXICACAO = [
  { value: "1", label: "Uso habitual" },
  { value: "2", label: "Acidental" },
  { value: "3", label: "Ambiental" },
  { value: "4", label: "Uso terapêutico" },
  { value: "5", label: "Prescrição médica inadequada" },
  { value: "6", label: "Erro de administração" },
  { value: "7", label: "Automedicação" },
  { value: "8", label: "Abuso" },
  { value: "9", label: "Ingestão de alimento" },
  { value: "10", label: "Tentativa de suicídio" },
  { value: "11", label: "Tentativa de aborto" },
  { value: "12", label: "Violência/homicídio" },
  { value: "13", label: "Outra" },
  { value: "99", label: "Ignorada" },
] as const;

export const SINAN_TIPO_ANIMAL_PECONHENTO = [
  { value: "1", label: "Serpente" },
  { value: "2", label: "Aranha" },
  { value: "3", label: "Escorpião" },
  { value: "4", label: "Lagarta" },
  { value: "5", label: "Abelha" },
  { value: "6", label: "Outros" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_TIPO_SERPENTE = [
  { value: "1", label: "Jararaca (Bothrops)" },
  { value: "2", label: "Cascavel (Crotalus)" },
  { value: "3", label: "Surucucu (Lachesis)" },
  { value: "4", label: "Coral verdadeira (Micrurus)" },
  { value: "5", label: "Não peçonhenta" },
  { value: "9", label: "Ignorado" },
] as const;

export const SINAN_TIPO_ARANHA = [
  { value: "1", label: "Phoneutria (armadeira)" },
  { value: "2", label: "Loxosceles (aranha-marrom)" },
  { value: "3", label: "Latrodectus (viúva-negra)" },
  { value: "4", label: "Outra" },
  { value: "9", label: "Ignorado" },
] as const;

export type SinanDomainValue<T extends readonly { value: string; label: string }[]> = T[number]["value"];
