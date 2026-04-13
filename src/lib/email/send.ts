import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCandidateEmail(
  to: string,
  name: string,
  status: 'approved' | 'rejected',
  calendarLink?: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email not sent.');
    return;
  }

  try {
    const subject = status === 'approved' 
      ? `Maverick 360 - Parabéns ${name}, você avançou!` 
      : `Maverick 360 - Atualização sobre sua candidatura`;
    
    // Bold, Minimalist tone based on Maverick branding
    const html = status === 'approved'
      ? `
        <div style="font-family: sans-serif; color: #0B0B0B; max-width: 600px; margin: 0 auto;">
          <h2>Olá ${name},</h2>
          <p>Temos boas notícias.</p>
          <p>Seu perfil tem grande match com a nossa cultura e os requisitos técnicos da vaga.</p>
          <p>Queremos avançar para a próxima etapa: <strong>A entrevista.</strong></p>
          <br/>
          <a href="${calendarLink || '#'}" style="background-color: #0B0B0B; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Agendar Entrevista</a>
          <br/><br/>
          <p>Até logo,</p>
          <p><strong>Equipe Maverick 360</strong></p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; color: #0B0B0B; max-width: 600px; margin: 0 auto;">
          <h2>Olá ${name},</h2>
          <p>Obrigado pelo seu tempo e interesse na vaga.</p>
          <p>Após uma análise cuidadosa, decidimos não seguir com a sua candidatura neste momento.</p>
          <p>Manteremos seu currículo em nossa base para o futuro.</p>
          <br/>
          <p>Sucesso na sua jornada,</p>
          <p><strong>Equipe Maverick 360</strong></p>
        </div>
      `;

    await resend.emails.send({
      from: 'Maverick 360 <hello@your-domain.com>',
      to,
      subject,
      html,
    });
    
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
