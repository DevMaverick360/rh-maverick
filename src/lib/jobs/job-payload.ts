export function parseApplicationCode(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return s || null
}

export function jobPayloadFromFormData(formData: FormData) {
  return {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    cultural_criteria: formData.get('cultural_criteria') as string,
    technical_criteria: formData.get('technical_criteria') as string,
    application_code: parseApplicationCode(formData.get('application_code')),
  }
}
