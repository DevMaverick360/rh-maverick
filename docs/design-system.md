# Maverick Design System (SaaS)

## 1. Brand Principles

- Bold > neutro
- Direto > explicativo
- Estratégico > decorativo
- Minimalista com impacto
- Conteúdo + autoridade

---

## 2. Color Palette

### Primary
- Black: #0B0B0B
- White: #FFFFFF

### Neutral
- Gray 900: #1A1A1A
- Gray 700: #4F4F4F
- Gray 500: #9E9E9E
- Gray 300: #E0E0E0
- Gray 100: #F5F5F5

### Accent (usar com moderação)
- Primary Accent: #FF3B3B (vermelho agressivo)
- Secondary Accent: #0066FF (tech / SaaS)

### Semantic
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444

---

## 3. Typography

### Font Stack
- Heading: "Inter", "Helvetica Neue", sans-serif
- Body: "Inter", sans-serif

### Scale

| Token | Size | Weight |
|------|------|--------|
| h1 | 48px | 700 |
| h2 | 36px | 700 |
| h3 | 28px | 600 |
| h4 | 22px | 600 |
| body-lg | 18px | 400 |
| body | 16px | 400 |
| caption | 14px | 400 |

### Style Rules
- Headings: uppercase opcional
- Espaçamento negativo leve (-1%)
- Muito espaço em branco

---

## 4. Spacing System

Base: 4px

| Token | Value |
|------|------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |
| 3xl | 64px |

---

## 5. Grid & Layout

- Container: max-width 1280px
- Grid: 12 colunas
- Gutters: 24px

### Layout Patterns
- Hero full-width
- Seções com fundo alternado (preto/branco)
- Cards grandes com respiro

---

## 6. Components

### Button

#### Primary
- Background: Black
- Text: White
- Hover: opacity 0.8

#### Secondary
- Border: 1px solid Black
- Background: Transparent

#### Ghost
- Background: none
- Text: Gray 700

---

### Input

- Border: 1px solid Gray 300
- Focus: Black
- Padding: 12px 16px
- Radius: 8px

---

### Card

- Background: White
- Border: 1px solid Gray 200
- Radius: 16px
- Padding: 24px

Hover:
- transform: translateY(-2px)
- shadow: medium

---

### Navbar

- Background: White ou transparente
- Altura: 72px
- Logo esquerda
- Menu direita
- CTA destacado

---

### Sidebar (SaaS)

- Background: Black
- Text: White
- Active: Accent

---

## 7. Data Display (SaaS)

### Table

- Header: bold + uppercase
- Row hover: Gray 100
- Border: subtle

### Metrics Card

- Número grande (32px+)
- Label pequeno
- Uso de contraste forte

---

## 8. Motion & Interaction

- Transition padrão: 0.2s ease-in-out
- Hover: leve escala (1.02)
- Microinterações discretas

---

## 9. Iconography

- Estilo: linear / minimal
- Biblioteca sugerida: Lucide / Heroicons

---

## 10. Tone of Voice (IMPORTANTE)

### Linguagem

- Curta
- Direta
- Sem enrolação

### Exemplos

❌ "Nossa plataforma oferece diversas funcionalidades"
✅ "Controle tudo em um só lugar"

❌ "Clique aqui para começar"
✅ "Começar agora"

---

## 11. SaaS Adaptation

### Dashboard

- Fundo: Gray 100
- Cards: White
- Sidebar: Black
- Destaques: Accent

### Hierarquia

1. Métricas
2. Ações
3. Conteúdo
4. Detalhes

---

## 12. Dark Mode (opcional)

- Background: #0B0B0B
- Cards: #1A1A1A
- Text: #FFFFFF
- Borders: #2A2A2A

---

## 13. Design Tokens (JSON exemplo)

```json
{
  "colors": {
    "primary": "#0B0B0B",
    "accent": "#FF3B3B",
    "background": "#FFFFFF"
  },
  "radius": {
    "md": "8px",
    "lg": "16px"
  },
  "spacing": {
    "md": "16px",
    "lg": "24px"
  }
}