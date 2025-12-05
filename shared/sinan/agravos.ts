export interface AgravoDefinition {
  codigo: string;
  nome: string;
  cid10: string;
  cid10Range?: string;
  categoria: string;
  prazoNotificacao: "imediata" | "semanal";
  fichaInvestigacao: boolean;
  templateId?: string;
  ativo: boolean;
}

export const SINAN_AGRAVOS_COMPLETOS: AgravoDefinition[] = [
  { codigo: "A00", nome: "Cólera", cid10: "A00", categoria: "alimentares", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A01.0", nome: "Febre Tifoide", cid10: "A01.0", categoria: "alimentares", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A05.1", nome: "Botulismo", cid10: "A05.1", categoria: "alimentares", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A15", nome: "Tuberculose", cid10: "A15", cid10Range: "A15-A19", categoria: "respiratorias", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A17.0", nome: "Meningite Tuberculosa", cid10: "A17.0", categoria: "meningites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A20", nome: "Peste", cid10: "A20", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A21", nome: "Tularemia", cid10: "A21", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A22", nome: "Antraz (Carbúnculo)", cid10: "A22", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A27", nome: "Leptospirose", cid10: "A27", categoria: "zoonoses", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A30", nome: "Hanseníase", cid10: "A30", categoria: "cronicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A33", nome: "Tétano Neonatal", cid10: "A33", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A35", nome: "Tétano Acidental", cid10: "A35", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A36", nome: "Difteria", cid10: "A36", categoria: "respiratorias", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A37", nome: "Coqueluche", cid10: "A37", categoria: "respiratorias", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A39", nome: "Doença Meningocócica", cid10: "A39", categoria: "meningites", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A50", nome: "Sífilis Congênita", cid10: "A50", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A51", nome: "Sífilis Adquirida", cid10: "A51", cid10Range: "A51-A53", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A52", nome: "Sífilis em Gestante", cid10: "A52", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A69.2", nome: "Doença de Lyme", cid10: "A69.2", categoria: "zoonoses", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A75", nome: "Tifo Epidêmico", cid10: "A75", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A77", nome: "Febre Maculosa e Rickettsioses", cid10: "A77", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A78", nome: "Febre Q", cid10: "A78", categoria: "zoonoses", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "A80", nome: "Poliomielite/Paralisia Flácida Aguda", cid10: "A80", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A82", nome: "Raiva Humana", cid10: "A82", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A82.AT", nome: "Atendimento Antirrábico", cid10: "A82", categoria: "zoonoses", prazoNotificacao: "semanal", fichaInvestigacao: false, ativo: true },
  { codigo: "A83", nome: "Encefalite por Arbovírus", cid10: "A83", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A90", nome: "Dengue", cid10: "A90", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A91", nome: "Dengue Hemorrágica", cid10: "A91", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A92.0", nome: "Chikungunya", cid10: "A92.0", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A92.3", nome: "Febre do Nilo Ocidental", cid10: "A92.3", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A92.8", nome: "Zika Vírus", cid10: "A92.8", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A93.0", nome: "Febre Oropouche", cid10: "A93.0", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A93.8", nome: "Febre Mayaro", cid10: "A93.8", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A95", nome: "Febre Amarela", cid10: "A95", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A96.2", nome: "Febre de Lassa", cid10: "A96.2", categoria: "virais", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A98.3", nome: "Febre Hemorrágica Marburg", cid10: "A98.3", categoria: "virais", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A98.4", nome: "Doença por Vírus Ebola", cid10: "A98.4", categoria: "virais", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "A98.5", nome: "Hantavirose", cid10: "A98.5", categoria: "zoonoses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B01", nome: "Varicela/Herpes Zoster", cid10: "B01", categoria: "imunoprevenivel", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B04", nome: "Mpox (Varíola dos Macacos)", cid10: "B04", categoria: "virais", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B05", nome: "Sarampo", cid10: "B05", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B06", nome: "Rubéola", cid10: "B06", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B15", nome: "Hepatite A", cid10: "B15", categoria: "hepatites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B16", nome: "Hepatite B", cid10: "B16", categoria: "hepatites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B17.1", nome: "Hepatite C", cid10: "B17.1", categoria: "hepatites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B17.0", nome: "Hepatite D", cid10: "B17.0", categoria: "hepatites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B17.2", nome: "Hepatite E", cid10: "B17.2", categoria: "hepatites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B20", nome: "HIV/AIDS em Adulto", cid10: "B20", cid10Range: "B20-B24", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B20.CR", nome: "HIV/AIDS em Criança", cid10: "B20", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B20.GE", nome: "HIV em Gestante/Parturiente", cid10: "B20", categoria: "ist", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B26", nome: "Caxumba", cid10: "B26", categoria: "imunoprevenivel", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B50", nome: "Malária por P. falciparum", cid10: "B50", categoria: "endemicas", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B51", nome: "Malária por P. vivax", cid10: "B51", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B55.0", nome: "Leishmaniose Visceral", cid10: "B55.0", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B55.1", nome: "Leishmaniose Tegumentar", cid10: "B55.1", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B57", nome: "Doença de Chagas Aguda", cid10: "B57", categoria: "endemicas", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "B57.CR", nome: "Doença de Chagas Crônica", cid10: "B57", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B65", nome: "Esquistossomose", cid10: "B65", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B74", nome: "Filariose", cid10: "B74", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "B83.2", nome: "Geo-helmintíases", cid10: "B83.2", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: false, ativo: true },
  { codigo: "G00", nome: "Meningite Bacteriana", cid10: "G00", cid10Range: "G00-G03", categoria: "meningites", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "G02", nome: "Meningite Viral", cid10: "G02", categoria: "meningites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "G03", nome: "Meningite Outras Etiologias", cid10: "G03", categoria: "meningites", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "J09", nome: "Influenza Pandêmica", cid10: "J09", categoria: "respiratorias", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "J10", nome: "Influenza por vírus identificado", cid10: "J10", categoria: "respiratorias", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "J80", nome: "SRAG (Síndrome Respiratória Aguda Grave)", cid10: "J80", categoria: "respiratorias", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "P35.0", nome: "Síndrome da Rubéola Congênita", cid10: "P35.0", categoria: "imunoprevenivel", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "Q02", nome: "Microcefalia", cid10: "Q02", categoria: "arboviroses", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "T63.4", nome: "Acidente por Animais Peçonhentos", cid10: "T63.4", categoria: "zoonoses", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "T65.9", nome: "Intoxicação Exógena", cid10: "T65.9", categoria: "intoxicacoes", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "U07.1", nome: "COVID-19", cid10: "U07.1", categoria: "respiratorias", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "W64", nome: "Acidente de Trabalho Grave", cid10: "W64", categoria: "trabalho", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "W65", nome: "Acidente de Trabalho com Exposição a Material Biológico", cid10: "W65", categoria: "trabalho", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "X49", nome: "Intoxicação Ocupacional", cid10: "X49", categoria: "trabalho", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "Y09", nome: "Violência Interpessoal/Autoprovocada", cid10: "Y09", categoria: "violencias", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "Y35", nome: "Intervenção Legal", cid10: "Y35", categoria: "violencias", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
  { codigo: "Z20.9", nome: "Contato com Doença Transmissível", cid10: "Z20.9", categoria: "vigilancia", prazoNotificacao: "semanal", fichaInvestigacao: false, ativo: true },
  { codigo: "Z22", nome: "Portador de Doença Infecciosa", cid10: "Z22", categoria: "vigilancia", prazoNotificacao: "semanal", fichaInvestigacao: false, ativo: true },
  { codigo: "SURTO", nome: "Surto de DTA", cid10: "A05.9", categoria: "alimentares", prazoNotificacao: "imediata", fichaInvestigacao: true, ativo: true },
  { codigo: "TRACOMA", nome: "Tracoma", cid10: "A71", categoria: "endemicas", prazoNotificacao: "semanal", fichaInvestigacao: false, ativo: true },
  { codigo: "ONCO", nome: "Oncobiológico - Evento Adverso", cid10: "Y43.4", categoria: "farmacovigilancia", prazoNotificacao: "semanal", fichaInvestigacao: true, ativo: true },
];

export const SINAN_CATEGORIAS = [
  { id: "arboviroses", nome: "Arboviroses", descricao: "Dengue, Chikungunya, Zika, Febre Amarela, Oropouche, Nilo Ocidental, Mayaro" },
  { id: "respiratorias", nome: "Doenças Respiratórias", descricao: "Tuberculose, Coqueluche, Difteria, SRAG, Influenza, COVID-19" },
  { id: "ist", nome: "IST/HIV/AIDS", descricao: "HIV/AIDS, Sífilis Congênita, em Gestante e Adquirida" },
  { id: "hepatites", nome: "Hepatites Virais", descricao: "Hepatites A, B, C, D, E" },
  { id: "meningites", nome: "Meningites", descricao: "Meningite bacteriana, viral, tuberculosa, outras etiologias" },
  { id: "zoonoses", nome: "Zoonoses", descricao: "Raiva, Leptospirose, Febre Maculosa, Hantavirose, Animais Peçonhentos" },
  { id: "endemicas", nome: "Doenças Endêmicas", descricao: "Malária, Leishmanioses, Chagas, Esquistossomose, Filariose" },
  { id: "cronicas", nome: "Doenças Crônicas", descricao: "Hanseníase" },
  { id: "imunoprevenivel", nome: "Imunopreveníveis", descricao: "Sarampo, Rubéola, Varicela, Poliomielite, Tétano, Caxumba" },
  { id: "intoxicacoes", nome: "Intoxicações", descricao: "Intoxicação Exógena por diversas substâncias" },
  { id: "violencias", nome: "Violências", descricao: "Violência doméstica, sexual, autoprovocada, intervenção legal" },
  { id: "trabalho", nome: "Saúde do Trabalhador", descricao: "Acidentes de trabalho, exposição biológica, intoxicação ocupacional" },
  { id: "virais", nome: "Doenças Virais Emergentes", descricao: "Mpox, Ebola, Marburg, Lassa e outras febres hemorrágicas" },
  { id: "alimentares", nome: "Doenças Transmitidas por Alimentos", descricao: "Botulismo, Febre Tifoide, Cólera, Surtos de DTA" },
  { id: "vigilancia", nome: "Vigilância Especial", descricao: "Contatos e portadores" },
  { id: "farmacovigilancia", nome: "Farmacovigilância", descricao: "Eventos adversos a medicamentos" },
] as const;

export function getAgravoByCode(codigo: string): AgravoDefinition | undefined {
  return SINAN_AGRAVOS_COMPLETOS.find(a => a.codigo === codigo);
}

export function getAgravoByCid(cid10: string): AgravoDefinition | undefined {
  return SINAN_AGRAVOS_COMPLETOS.find(a => a.cid10 === cid10 || a.cid10Range?.includes(cid10));
}

export function getAgravosByCategoria(categoria: string): AgravoDefinition[] {
  return SINAN_AGRAVOS_COMPLETOS.filter(a => a.categoria === categoria && a.ativo);
}

export function getAgravosImediatos(): AgravoDefinition[] {
  return SINAN_AGRAVOS_COMPLETOS.filter(a => a.prazoNotificacao === "imediata" && a.ativo);
}

export function getAgravosAtivos(): AgravoDefinition[] {
  return SINAN_AGRAVOS_COMPLETOS.filter(a => a.ativo);
}

export function getCidMapFromAgravos(): Record<string, { cid: string; name: string }> {
  const map: Record<string, { cid: string; name: string }> = {};
  for (const agravo of SINAN_AGRAVOS_COMPLETOS) {
    const key = agravo.nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    map[key] = { cid: agravo.cid10, name: agravo.nome };
  }
  return map;
}
