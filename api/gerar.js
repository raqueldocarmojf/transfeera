export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { url, conteudo, persona, canal, objetivo, contexto, email } = req.body;

  if (!persona) return res.status(400).json({ error: "Persona é obrigatória." });
  if (!url && !conteudo) return res.status(400).json({ error: "Informe o link do site ou cole o conteúdo manualmente." });

  const EMAILS_AUTORIZADOS = (process.env.EMAILS_AUTORIZADOS || "").split(",").map(e => e.trim().toLowerCase());
  const emailUsuario = (email || "").trim().toLowerCase();

  if (!emailUsuario) return res.status(401).json({ error: "E-mail obrigatório para acessar a ferramenta." });
  if (EMAILS_AUTORIZADOS.length > 0 && !EMAILS_AUTORIZADOS.includes(emailUsuario)) {
    return res.status(403).json({ error: "Acesso não autorizado. Entre em contato com seu gestor para liberar o acesso." });
  }

  let conteudoFinal = conteudo || "";

  if (url && url.startsWith("http")) {
    try {
      const siteRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
        signal: AbortSignal.timeout(8000)
      });
      const html = await siteRes.text();
      const semTags = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 6000);
      conteudoFinal = semTags + (conteudo ? "\n\nContexto adicional do SDR:\n" + conteudo : "");
    } catch (e) {
      if (!conteudo) return res.status(400).json({ error: "Nao foi possivel acessar o site. Cole o conteudo manualmente." });
    }
  }

  const CATALOGO = `
1. Pague e Receba por Pix: pagamentos e recebimentos instantaneos 24/7, lote via planilha, QR code, API. Ideal para empresas com alto volume de pagamentos a fornecedores, parceiros ou clientes.
2. Pix Automatico: automatiza cobrancas recorrentes com uma unica autorizacao do cliente. Ideal para assinaturas, mensalidades ou cobrancas recorrentes.
3. Receba por Boleto com QR Code: boletos com QR Code Pix integrado, vencimento, juros e multas configuraveis, API. Ideal para empresas que precisam do boleto mas querem modernizar a experiencia.
4. Pague Boletos em Lote: pagamento de boletos em massa via plataforma ou API, comprovantes automaticos. Ideal para empresas com alto volume de contas a pagar.
5. Link de Pagamento: receba por Pix ou Boleto sem maquininha. Ideal para e-commerces e prestadores de servico que precisam de cobranca simples.
6. Validacao de Dados Bancarios: confirma se uma conta e real antes de realizar pagamentos. Reduz estornos e fraudes. Ideal para fintechs, marketplaces e logistica que fazem repasses a terceiros.
7. Plataforma de Pagamentos: interface completa para o time financeiro, pagamentos em lote, comprovantes, controle centralizado. Ideal para empresas que querem centralizar a operacao financeira.
8. API de Pagamentos: integracao tecnica completa, SLA 99.9%, sandbox gratuito, documentacao detalhada. Ideal para fintechs e empresas de tecnologia que querem embeddar pagamentos no proprio produto.
9. Split de Pagamentos: automatiza a divisao de valores entre multiplas partes no recebimento. Ideal para marketplaces, delivery, franquias e plataformas que repassam valores a parceiros.
10. Multicontas: contas adicionais para o mesmo CNPJ com segregacao de saldos. Ideal para empresas com multiplas operacoes ou unidades.
11. Subcontas: contas para empresas terceiras sob o CNPJ da Transfeera. Ideal para marketplaces e franqueadoras que querem oferecer conta exclusiva para cada parceiro.
12. Sistema para Bets: solucao completa de pagamentos para casas de apostas. Ideal para empresas do setor que precisam de infraestrutura financeira regulada e escalavel.`;

  const CASES = `
- Sim (fintech de credito do Grupo Santander): enfrentava alto volume de devolucao de TEDs ao liberar credito para correntistas de outros bancos. Apos implantar validacao de dados bancarios da Transfeera via API em dois momentos do onboarding, reduziu 70% das falhas em tres meses de operacao e eliminou reclamacoes no suporte por atrasos no recebimento do credito. Segmento: fintech de credito.
- Squid (plataforma de marketing de influencia): precisava de uma API de pagamentos estavelque nunca deixasse o time na mao. Integracao via API da Transfeera resolveu o problema com documentacao de alto nivel e SLA garantido. Segmento: marketplace/plataforma digital.
- Interisk (gestao de riscos): buscava excelente performance de plataforma com atendimento dedicado. Resultado: operacao financeira centralizada, sem erros e com suporte especializado. Segmento: SaaS B2B.
- Moneri: processo financeiro que consumia 12 horas da equipe passou a ser executado em 5 minutos apos integracao com a Transfeera. Segmento: empresa de servicos financeiros.`;

  const prompt = `Voce e um especialista em prospeccao B2B outbound do time comercial da Transfeera, fintech de pagamentos B2B autorizada pelo Banco Central com mais de 70 bilhoes de reais transacionados e 90 milhoes de transacoes realizadas. Voce escreve mensagens diretas, personalizadas e consultivas, nunca genericas.

PORTFOLIO:
${CATALOGO}

CASES DE SUCESSO DA TRANSFEERA:
${CASES}

CONTEXTO DA ABORDAGEM:
- Conteudo do prospect: ${conteudoFinal}
- Persona alvo (cargo e contexto): ${persona}
- Canal: ${canal}
- Objetivo: ${objetivo}
${contexto ? `- Contexto adicional: ${contexto}` : ""}

FRAMEWORK RAIZ - siga essa estrutura rigorosamente na mensagem:
R (Relevancia Real): abra com uma observacao especifica e verificavel sobre o prospect, uma vaga aberta, expansao, caracteristica do modelo de negocio, volume de transacoes ou parceiros. NUNCA elogio generico.
A (Abertura Contextual): conecte o que foi observado com uma dor de mercado conhecida nesse segmento. Ex: empresas com modelo de marketplace costumam ter gargalo nos repasses para sellers, ou fintechs com alto volume de pagamentos sofrem com estornos e validacao de dados. Mostre que voce entende o padrao do mercado.
I (Insight): traga o case da Transfeera mais similar ao perfil do prospect. Use dados concretos como reducao de 70% em falhas, processo que caiu de 12 horas para 5 minutos, API com SLA de 99.9%.
Z (Zona de Convite): feche com uma pergunta leve e de baixo compromisso. Ex: Faz sentido trocarmos uma ideia sobre isso em 15 min? ou Como voces estao resolvendo hoje o repasse para parceiros? NUNCA vamos marcar uma reuniao.

REGRAS DE TOM E ESTILO:
- Use o primeiro nome da persona no inicio e ao longo da mensagem
- Seja direto e objetivo, sem rodeios
- Tom consultivo, nao de vendedor
- Adapte o vocabulario ao cargo: CFO e financeiro falam em eficiencia, custo e controle. CTO e tech falam em API, integracao e SLA. CEO e fundadores falam em escala e crescimento. Operacional fala em rotina, volume e erro zero
- LinkedIn: curto, direto, paragrafos de 1 a 2 linhas
- Email: um pouco mais longo, contextual, feche com Abracos e nome do SDR
- WhatsApp: muito curto, informal, uma pergunta no final
- Ligacao: roteiro com abertura, contexto e pergunta de diagnostico
- NUNCA mencione o nome da solucao de forma comercial, fale em resultado e dor resolvida

Identifique qual solucao tem maior fit e gere a abordagem seguindo rigorosamente o RAIZ.

Responda SOMENTE em JSON valido, sem markdown nem texto fora do JSON:
{"produto_indicado":"nome exato de uma das 12 solucoes","fit_score":85,"justificativa_fit":"2-3 frases sobre o fit usando dados reais do prospect e do case mais parecido","sinais_de_compra":["sinal 1 observado no prospect","sinal 2","sinal 3"],"abordagem":"mensagem completa seguindo o framework RAIZ no tom e formato do canal escolhido assinada como time comercial Transfeera","dicas_de_follow_up":["dica pratica 1 baseada no contexto real","dica pratica 2"]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1200,
        messages: [
          { role: "system", content: "Especialista em prospeccao B2B de pagamentos. Responda sempre em JSON valido." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err?.error?.message || "Erro na API" });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
