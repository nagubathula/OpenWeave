import { SceneGraph } from '@openweave/scene-graph'

export interface HomeTemplate {
  id: string
  name: string
  category: string
  description: string
  tag: string
  accentColor: string
  createGraph: () => SceneGraph
}

export function createMobileAppTemplate(): SceneGraph {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? '0:1'

  // Screen 1: Dashboard (iPhone 16 Pro: 393 x 852)
  const screen = graph.createNode('FRAME', pageId, {
    name: 'Dashboard - iPhone 16 Pro',
    x: 100,
    y: 100,
    width: 393,
    height: 852,
    cornerRadius: 48,
    clipsContent: true,
    fills: [
      { type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.09, a: 1 }, opacity: 1, visible: true }
    ]
  })

  // Header
  graph.createNode('TEXT', screen.id, {
    name: 'Header Title',
    text: 'Overview',
    fontSize: 24,
    fontWeight: 700,
    x: 24,
    y: 60,
    width: 200,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // Hero Balance Card
  const card = graph.createNode('FRAME', screen.id, {
    name: 'Balance Card',
    x: 24,
    y: 110,
    width: 345,
    height: 180,
    cornerRadius: 24,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.35, b: 0.95, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', card.id, {
    name: 'Card Label',
    text: 'Total Balance',
    fontSize: 14,
    fontWeight: 400,
    x: 24,
    y: 24,
    width: 150,
    height: 20,
    fills: [{ type: 'SOLID', color: { r: 0.85, g: 0.9, b: 1, a: 0.8 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', card.id, {
    name: 'Balance Value',
    text: '$24,580.00',
    fontSize: 32,
    fontWeight: 700,
    x: 24,
    y: 52,
    width: 250,
    height: 40,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // Action Buttons
  const actions = ['Send', 'Receive', 'Swap', 'More']
  actions.forEach((action, i) => {
    const btn = graph.createNode('FRAME', screen.id, {
      name: `Action - ${action}`,
      x: 24 + i * 88,
      y: 310,
      width: 76,
      height: 64,
      cornerRadius: 16,
      fills: [
        { type: 'SOLID', color: { r: 0.14, g: 0.15, b: 0.18, a: 1 }, opacity: 1, visible: true }
      ]
    })
    graph.createNode('TEXT', btn.id, {
      name: 'Label',
      text: action,
      fontSize: 12,
      fontWeight: 500,
      textAlignHorizontal: 'CENTER',
      x: 0,
      y: 24,
      width: 76,
      height: 16,
      fills: [
        { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.95, a: 1 }, opacity: 1, visible: true }
      ]
    })
  })

  // Transactions Section
  graph.createNode('TEXT', screen.id, {
    name: 'Section Title',
    text: 'Recent Activity',
    fontSize: 18,
    fontWeight: 600,
    x: 24,
    y: 400,
    width: 200,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  const items = [
    { title: 'Apple Store', sub: 'MacBook Pro M4', amount: '-$1,999.00' },
    { title: 'Stripe Payout', sub: 'SaaS Subscription', amount: '+$4,250.00' },
    { title: 'Figma Subscription', sub: 'Annual Plan', amount: '-$144.00' }
  ]

  items.forEach((item, index) => {
    const row = graph.createNode('FRAME', screen.id, {
      name: `Transaction - ${item.title}`,
      x: 24,
      y: 440 + index * 70,
      width: 345,
      height: 60,
      cornerRadius: 14,
      fills: [
        { type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.15, a: 1 }, opacity: 1, visible: true }
      ]
    })

    graph.createNode('TEXT', row.id, {
      name: 'Title',
      text: item.title,
      fontSize: 14,
      fontWeight: 600,
      x: 16,
      y: 12,
      width: 180,
      height: 18,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    graph.createNode('TEXT', row.id, {
      name: 'Subtitle',
      text: item.sub,
      fontSize: 11,
      fontWeight: 400,
      x: 16,
      y: 32,
      width: 180,
      height: 16,
      fills: [
        { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.65, a: 1 }, opacity: 1, visible: true }
      ]
    })

    graph.createNode('TEXT', row.id, {
      name: 'Amount',
      text: item.amount,
      fontSize: 14,
      fontWeight: 600,
      textAlignHorizontal: 'RIGHT',
      x: 210,
      y: 20,
      width: 120,
      height: 20,
      fills: [
        {
          type: 'SOLID',
          color: item.amount.startsWith('+')
            ? { r: 0.2, g: 0.8, b: 0.4, a: 1 }
            : { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
  })

  // Bottom Navigation Bar
  const nav = graph.createNode('FRAME', screen.id, {
    name: 'Bottom Navigation',
    x: 0,
    y: 772,
    width: 393,
    height: 80,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12, a: 1 }, opacity: 1, visible: true }]
  })

  const tabs = ['Home', 'Cards', 'Stats', 'Profile']
  tabs.forEach((tab, i) => {
    graph.createNode('TEXT', nav.id, {
      name: `Tab - ${tab}`,
      text: tab,
      fontSize: 12,
      fontWeight: i === 0 ? 600 : 400,
      textAlignHorizontal: 'CENTER',
      x: i * (393 / 4),
      y: 20,
      width: 393 / 4,
      height: 20,
      fills: [
        {
          type: 'SOLID',
          color: i === 0 ? { r: 0.35, g: 0.55, b: 1, a: 1 } : { r: 0.5, g: 0.5, b: 0.55, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
  })

  return graph
}

export function createLandingPageTemplate(): SceneGraph {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? '0:1'

  const desktop = graph.createNode('FRAME', pageId, {
    name: 'Landing Page - Desktop 1440',
    x: 100,
    y: 100,
    width: 1440,
    height: 900,
    clipsContent: true,
    fills: [
      { type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.07, a: 1 }, opacity: 1, visible: true }
    ]
  })

  // Navbar
  const nav = graph.createNode('FRAME', desktop.id, {
    name: 'Navigation Bar',
    x: 0,
    y: 0,
    width: 1440,
    height: 80,
    fills: [
      { type: 'SOLID', color: { r: 0.08, g: 0.08, b: 0.1, a: 0.8 }, opacity: 1, visible: true }
    ]
  })

  graph.createNode('TEXT', nav.id, {
    name: 'Brand Logo',
    text: 'OpenWeave',
    fontSize: 20,
    fontWeight: 800,
    x: 80,
    y: 28,
    width: 160,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  const navLinks = ['Features', 'Templates', 'Docs', 'Changelog']
  navLinks.forEach((link, i) => {
    graph.createNode('TEXT', nav.id, {
      name: `Link - ${link}`,
      text: link,
      fontSize: 14,
      fontWeight: 500,
      x: 450 + i * 110,
      y: 30,
      width: 100,
      height: 20,
      fills: [
        { type: 'SOLID', color: { r: 0.75, g: 0.75, b: 0.8, a: 1 }, opacity: 1, visible: true }
      ]
    })
  })

  const ctaBtn = graph.createNode('FRAME', nav.id, {
    name: 'Get Started Button',
    x: 1220,
    y: 18,
    width: 140,
    height: 44,
    cornerRadius: 8,
    fills: [
      { type: 'SOLID', color: { r: 0.25, g: 0.45, b: 0.95, a: 1 }, opacity: 1, visible: true }
    ]
  })

  graph.createNode('TEXT', ctaBtn.id, {
    name: 'CTA Label',
    text: 'Get Started',
    fontSize: 14,
    fontWeight: 600,
    textAlignHorizontal: 'CENTER',
    x: 0,
    y: 12,
    width: 140,
    height: 20,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // Hero Section
  graph.createNode('TEXT', desktop.id, {
    name: 'Hero Tagline',
    text: 'THE OPEN-SOURCE DESIGN ENGINE',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.5,
    textAlignHorizontal: 'CENTER',
    x: 320,
    y: 180,
    width: 800,
    height: 20,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.6, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', desktop.id, {
    name: 'Hero Title',
    text: 'Design, code, and prototype\nwithout boundaries.',
    fontSize: 56,
    fontWeight: 800,
    lineHeight: 64,
    textAlignHorizontal: 'CENTER',
    x: 220,
    y: 215,
    width: 1000,
    height: 135,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', desktop.id, {
    name: 'Hero Subtitle',
    text: 'OpenWeave combines the precision of Figma with the freedom of local-first storage, CanvasKit GPU rendering, and AI coding agents.',
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 28,
    textAlignHorizontal: 'CENTER',
    x: 340,
    y: 370,
    width: 760,
    height: 60,
    fills: [
      { type: 'SOLID', color: { r: 0.65, g: 0.65, b: 0.72, a: 1 }, opacity: 1, visible: true }
    ]
  })

  // Feature Cards
  const features = [
    {
      title: 'Figma Parity',
      desc: 'Auto layout, variables, component sets, and .fig round-trip fidelity.'
    },
    {
      title: 'Local-First',
      desc: 'Your files stay securely on your computer with optional private S3 sync.'
    },
    {
      title: 'AI Automation',
      desc: 'Built-in MCP tools and AI agents to design, inspect, and iterate rapidly.'
    }
  ]

  features.forEach((feat, i) => {
    const card = graph.createNode('FRAME', desktop.id, {
      name: `Feature Card - ${feat.title}`,
      x: 180 + i * 380,
      y: 490,
      width: 340,
      height: 200,
      cornerRadius: 16,
      fills: [
        { type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.14, a: 1 }, opacity: 1, visible: true }
      ]
    })

    graph.createNode('TEXT', card.id, {
      name: 'Card Title',
      text: feat.title,
      fontSize: 20,
      fontWeight: 700,
      x: 28,
      y: 32,
      width: 280,
      height: 26,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    graph.createNode('TEXT', card.id, {
      name: 'Card Description',
      text: feat.desc,
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 22,
      x: 28,
      y: 72,
      width: 280,
      height: 70,
      fills: [
        { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.68, a: 1 }, opacity: 1, visible: true }
      ]
    })
  })

  return graph
}

export function createDesignSystemTemplate(): SceneGraph {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? '0:1'

  const board = graph.createNode('FRAME', pageId, {
    name: 'Design System & UI Kit',
    x: 100,
    y: 100,
    width: 1200,
    height: 800,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.08, g: 0.08, b: 0.1, a: 1 }, opacity: 1, visible: true }]
  })

  // Title
  graph.createNode('TEXT', board.id, {
    name: 'Section Heading',
    text: 'Core Design Tokens & Components',
    fontSize: 28,
    fontWeight: 700,
    x: 60,
    y: 50,
    width: 600,
    height: 36,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // Colors
  graph.createNode('TEXT', board.id, {
    name: 'Colors Label',
    text: 'Brand Colors',
    fontSize: 16,
    fontWeight: 600,
    x: 60,
    y: 120,
    width: 200,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.85, a: 1 }, opacity: 1, visible: true }]
  })

  const palette = [
    { name: 'Primary 500', color: { r: 0.25, g: 0.45, b: 0.95, a: 1 } },
    { name: 'Accent 500', color: { r: 0.6, g: 0.3, b: 0.9, a: 1 } },
    { name: 'Success 500', color: { r: 0.2, g: 0.75, b: 0.4, a: 1 } },
    { name: 'Warning 500', color: { r: 0.95, g: 0.65, b: 0.15, a: 1 } },
    { name: 'Neutral 900', color: { r: 0.12, g: 0.12, b: 0.15, a: 1 } }
  ]

  palette.forEach((swatch, i) => {
    graph.createNode('FRAME', board.id, {
      name: swatch.name,
      x: 60 + i * 140,
      y: 160,
      width: 120,
      height: 90,
      cornerRadius: 12,
      fills: [{ type: 'SOLID', color: swatch.color, opacity: 1, visible: true }]
    })
    graph.createNode('TEXT', board.id, {
      name: 'Swatch Name',
      text: swatch.name,
      fontSize: 12,
      fontWeight: 500,
      x: 60 + i * 140,
      y: 260,
      width: 120,
      height: 18,
      fills: [
        { type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.75, a: 1 }, opacity: 1, visible: true }
      ]
    })
  })

  // Button Components
  graph.createNode('TEXT', board.id, {
    name: 'Buttons Label',
    text: 'Buttons',
    fontSize: 16,
    fontWeight: 600,
    x: 60,
    y: 320,
    width: 200,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.85, a: 1 }, opacity: 1, visible: true }]
  })

  const buttons = [
    {
      label: 'Primary Button',
      bg: { r: 0.25, g: 0.45, b: 0.95, a: 1 },
      text: { r: 1, g: 1, b: 1, a: 1 }
    },
    {
      label: 'Secondary Button',
      bg: { r: 0.2, g: 0.2, b: 0.25, a: 1 },
      text: { r: 1, g: 1, b: 1, a: 1 }
    },
    { label: 'Ghost Button', bg: { r: 0, g: 0, b: 0, a: 0 }, text: { r: 0.6, g: 0.75, b: 1, a: 1 } }
  ]

  buttons.forEach((btn, i) => {
    const buttonFrame = graph.createNode('FRAME', board.id, {
      name: btn.label,
      x: 60 + i * 180,
      y: 360,
      width: 160,
      height: 48,
      cornerRadius: 10,
      fills: [{ type: 'SOLID', color: btn.bg, opacity: 1, visible: true }]
    })

    graph.createNode('TEXT', buttonFrame.id, {
      name: 'Button Text',
      text: btn.label,
      fontSize: 14,
      fontWeight: 600,
      textAlignHorizontal: 'CENTER',
      x: 0,
      y: 14,
      width: 160,
      height: 20,
      fills: [{ type: 'SOLID', color: btn.text, opacity: 1, visible: true }]
    })
  })

  return graph
}

export function createPresentationTemplate(): SceneGraph {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? '0:1'

  // Slide 1: Cover
  const slide1 = graph.createNode('FRAME', pageId, {
    name: 'Slide 1 - Title Deck (16:9)',
    x: 100,
    y: 100,
    width: 1920,
    height: 1080,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.06, g: 0.07, b: 0.1, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', slide1.id, {
    name: 'Presentation Category',
    text: 'PRODUCT ROADMAP 2026',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 2,
    x: 160,
    y: 360,
    width: 600,
    height: 36,
    fills: [{ type: 'SOLID', color: { r: 0.35, g: 0.6, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', slide1.id, {
    name: 'Presentation Title',
    text: 'Building the Future\nof Open Design Tools',
    fontSize: 84,
    fontWeight: 800,
    lineHeight: 96,
    x: 160,
    y: 420,
    width: 1400,
    height: 200,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  graph.createNode('TEXT', slide1.id, {
    name: 'Presenter Details',
    text: 'OpenWeave Engineering Team · Confidential',
    fontSize: 20,
    fontWeight: 400,
    x: 160,
    y: 650,
    width: 600,
    height: 30,
    fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  return graph
}

export const HOME_TEMPLATES: HomeTemplate[] = [
  {
    id: 'mobile-app',
    name: 'Mobile App Starter',
    category: 'Mobile',
    description: 'iPhone 16 Pro screens with balance card, actions, and bottom nav',
    tag: 'iOS & Android',
    accentColor: '#3b82f6',
    createGraph: createMobileAppTemplate
  },
  {
    id: 'landing-page',
    name: 'Landing Page & Hero',
    category: 'Web',
    description: 'Modern desktop layout with responsive navbar, hero, and features',
    tag: 'Web 1440px',
    accentColor: '#8b5cf6',
    createGraph: createLandingPageTemplate
  },
  {
    id: 'design-system',
    name: 'Design System & Tokens',
    category: 'UI Kit',
    description: 'Core color tokens, typographic scale, and reusable button components',
    tag: 'Tokens & UI',
    accentColor: '#10b981',
    createGraph: createDesignSystemTemplate
  },
  {
    id: 'presentation',
    name: 'Pitch Deck & Slides',
    category: 'Presentation',
    description: '16:9 master slides with clean typography and layout pillars',
    tag: '16:9 Deck',
    accentColor: '#f59e0b',
    createGraph: createPresentationTemplate
  }
]
