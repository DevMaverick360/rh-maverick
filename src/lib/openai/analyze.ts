import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIAnalysisResult {
  culturalScore: number;
  technicalScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'approve' | 'reject';
}

export async function analyzeCVWithAI(
  cvText: string,
  culturalCriteria: string,
  technicalCriteria: string,
  jobDescription?: string,
  formResponsesContext?: string
): Promise<AIAnalysisResult> {
  const descBlock =
    jobDescription?.trim() ?
      `
  Descrição da Vaga (contexto adicional):
  ${jobDescription.trim()}
`
      : ''

  const formBlock =
    formResponsesContext?.trim() ?
      `
  Respostas do formulário de candidatura (pergunta e resposta do candidato):
  ${formResponsesContext.trim()}
`
      : ''

  const prompt = `
  Você atua como um sistema automatizado de Recrutamento de RH (Maverick 360).
  Analise o currículo do candidato com base nos critérios a seguir:
  ${descBlock}
  Critérios Culturais:
  ${culturalCriteria}
  
  Critérios Técnicos:
  ${technicalCriteria}
  ${formBlock}
  Texto do Currículo do Candidato:
  ${cvText.substring(0, 15000)} // Capping length
  
  Você deve retornar um objeto JSON válido (SEM formatação markdown adicional, apenas JSON puro) com a exata estrutura:
  {
    "culturalScore": <numero de 0 a 100>,
    "technicalScore": <numero de 0 a 100>,
    "summary": "<Resumo executivo do candidato em max 3 frases>",
    "strengths": ["<força 1>", "<força 2>"],
    "weaknesses": ["<fraqueza 1>", "<fraqueza 2>"],
    "recommendation": "<'approve' ou 'reject'>"
  }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0].message.content || '{}';
    const result = JSON.parse(resultText) as AIAnalysisResult;
    
    return result;
  } catch (error) {
    console.error('OpenAI Error:', error);
    // Fallback in case of AI parsing failure
    return {
      culturalScore: 0,
      technicalScore: 0,
      summary: "Falha ao processar análise via IA.",
      strengths: [],
      weaknesses: [],
      recommendation: "reject",
    };
  }
}
