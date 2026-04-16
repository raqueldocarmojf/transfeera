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
      if (!conteudo) return res.status(400).json({ error: "Não foi possível acessar o site. Cole o conteúdo manualmente." });
    }
  }

  const CATALOGO = `
1. Pague e Receba por Pix: pagamentos e recebimentos instantâneos 24/7, lote via planilha, QR code, API. Ideal para empresas com alto volume de pagamentos a fornecedores, parceiros ou clientes.
2. Pix Automático: automatiza cobranças recorrentes com uma única autorização do cliente. Ideal para assinaturas, mensalidades ou cobranças recorrentes que querem reduzir inadimplência.
3. Receba por Boleto (com QR Code): boletos com QR Code Pix integrado, vencimento, juros e multas configuráveis, API. Ideal para empresas que precisam do boleto mas querem modernizar a experiência.
4. Pague Boletos em Lote: pagamento de boletos em massa via plataforma ou API, comprovantes automáticos. Ideal para empresas com alto volume de contas a pagar.
5. Link de Pagamento: receba por Pix ou Boleto sem maquininha. Ideal para e-commerces e prestadores de serviço que precisam de cobrança simples.
6. Validação de Dados Bancários: confirma se uma conta é real antes de realizar pagamentos. Reduz estornos e fraudes. Ideal para marketplaces e logística que fazem repasses a terceiros.
7. Plataforma de Pagamentos: interface completa para o time financeiro — pagamentos em lote, comprovantes, controle centralizado. Ideal para empresas que querem centralizar a operação financeira.
8. API de Pagamentos: integração técnica completa, SLA 99,9%, sandbox gratuito, documentação detalhada. Ideal para fintechs e empresas de tecnologia que querem embeddar pagamentos no próprio produto.
9. Split de Pagamentos: automatiza a divisão de valores entre múltiplas partes no recebimento. Ideal para marketplaces, delivery, franquias e plataformas que repassam valores a parceiros.
10. Multicontas: contas adicionais para o mesmo CNPJ com segregação de saldos. Ideal para empresas com múltiplas operações ou unidades.
11. Subcontas: contas para empresas terceiras sob o CNPJ da Transfeera. Ideal para marketplaces e franqueadoras que querem oferecer conta exclusiva para cada parceiro.
12. Sistema para Bets: solução completa de pagamentos para casas de apostas. Ideal para empresas do setor que precisam de infraestrutura financeira regulada e escalável.`;

  const prompt = `Você é especialista em prospecção B2B outbound do time comercial da Transfeera, fintech de pagamentos B2B autorizada pelo Banco Central.

PORTFÓLIO:
${CATALOGO}

CONTEXTO:
- Conteúdo do prospect: ${conteudoFinal}
- Persona: ${persona}
- Canal: ${canal}
- Objetivo: ${objetivo}
${contexto ? `- Contexto adicional: ${contexto}` : ""}

Identifique a solução com maior fit e gere abordagem consultiva e direta usando informações reais do prospect. Assine como time comercial Transfeera.

Responda SOMENTE em JSON válido:
{"produto_indicado":"nome exato de uma das 12 soluções","fit_score":85,"justificativa_fit":"2-3 frases com dados reais do prospect","sinais_de_compra":["sinal 1","sinal 2","sinal 3"],"abordagem":"mensagem completa personalizada com detalhes reais do prospect","dicas_de_follow_up":["dica 1","dica 2"]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [
          { role: "system", content: "Especialista em prospecção B2B de pagamentos. Responda sempre em JSON válido." },
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
