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

export function createFigmaMotionTemplate(): SceneGraph {
  const graph = new SceneGraph()
  const pages = graph.getPages()
  const motionPage = pages[0]
  if (motionPage) {
    motionPage.name = '5 Easy Figma Motion'
  }
  const pageId = motionPage?.id ?? '0:1'

  // -------------------------------------------------------------
  // Header Frame: Title & Instructions
  // -------------------------------------------------------------
  const headerFrame = graph.createNode('FRAME', pageId, {
    name: 'Header & Instructions',
    x: 80,
    y: 50,
    width: 1760,
    height: 100,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.13, a: 0.6 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 1, g: 1, b: 1, a: 0.08 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ],
    cornerRadius: 16
  })

  // Title badge
  const badgeFrame = graph.createNode('FRAME', headerFrame.id, {
    name: 'Motion Badge',
    x: 24,
    y: 20,
    width: 100,
    height: 24,
    cornerRadius: 12,
    fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.6, b: 0.38, a: 0.2 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.05, g: 0.6, b: 0.38, a: 0.4 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })
  graph.createNode('TEXT', badgeFrame.id, {
    name: 'Badge Label',
    text: '✦ PLAYGROUND',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textAlignHorizontal: 'CENTER',
    x: 0,
    y: 5,
    width: 100,
    height: 14,
    fills: [{ type: 'SOLID', color: { r: 0.24, g: 0.81, b: 0.5, a: 1 }, opacity: 1, visible: true }]
  })

  // Main title
  graph.createNode('TEXT', headerFrame.id, {
    name: 'Title Text',
    text: '5 Easy Figma Motion Animations',
    fontSize: 24,
    fontWeight: 800,
    x: 136,
    y: 18,
    width: 500,
    height: 30,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // Subtitle
  graph.createNode('TEXT', headerFrame.id, {
    name: 'Subtitle Text',
    text: 'Press Space or click ▶ Play in the bottom timeline to preview all 5 animations. Select any card to inspect its motion tracks.',
    fontSize: 13,
    fontWeight: 400,
    x: 24,
    y: 56,
    width: 800,
    height: 22,
    fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.62, b: 0.7, a: 1 }, opacity: 1, visible: true }]
  })

  // Right pill: "Interactive Timeline Ready"
  const readyPill = graph.createNode('FRAME', headerFrame.id, {
    name: 'Ready Pill',
    x: 1530,
    y: 32,
    width: 190,
    height: 36,
    cornerRadius: 18,
    fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 1, g: 1, b: 1, a: 0.1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })
  graph.createNode('TEXT', readyPill.id, {
    name: 'Pill Label',
    text: '▶  Timeline Ready · 2.0s',
    fontSize: 12,
    fontWeight: 600,
    textAlignHorizontal: 'CENTER',
    x: 0,
    y: 10,
    width: 190,
    height: 18,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  // -------------------------------------------------------------
  // Card 1: "01 · Smooth Toggle Switch" (x = 80, y = 190)
  // -------------------------------------------------------------
  const card1 = graph.createNode('FRAME', pageId, {
    name: '01 · Toggle Switch',
    x: 80,
    y: 190,
    width: 320,
    height: 320,
    cornerRadius: 20,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.14, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.18, g: 0.18, b: 0.24, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  graph.createNode('TEXT', card1.id, {
    name: 'Card 1 Category',
    text: '01 · TOGGLE SWITCH',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    x: 24,
    y: 24,
    width: 200,
    height: 16,
    fills: [{ type: 'SOLID', color: { r: 0.24, g: 0.81, b: 0.5, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card1.id, {
    name: 'Card 1 Title',
    text: 'Spring Physics Toggle',
    fontSize: 18,
    fontWeight: 700,
    x: 24,
    y: 44,
    width: 260,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card1.id, {
    name: 'Card 1 Description',
    text: 'Position slide with squash-and-stretch mid-flight deformation.',
    fontSize: 11,
    fontWeight: 400,
    x: 24,
    y: 72,
    width: 260,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.55, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  // Toggle Track
  const toggleTrack = graph.createNode('FRAME', card1.id, {
    name: 'Toggle Track',
    x: 95,
    y: 170,
    width: 130,
    height: 68,
    cornerRadius: 34,
    fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22, a: 1 }, opacity: 1, visible: true }]
  })

  // Toggle Thumb (Animated x, width)
  const toggleThumb = graph.createNode('FRAME', toggleTrack.id, {
    name: 'Toggle Thumb',
    x: 8,
    y: 8,
    width: 52,
    height: 52,
    cornerRadius: 26,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  toggleThumb.motionTracks = {
    nodeId: toggleThumb.id,
    nodeName: toggleThumb.name,
    tracks: {
      x: {
        property: 'x',
        keyframes: [
          { id: 'kf-t1-x0', timeMs: 0, value: 8, easing: 'spring' },
          { id: 'kf-t1-x1', timeMs: 500, value: 70, easing: 'spring' },
          { id: 'kf-t1-x2', timeMs: 1100, value: 70, easing: 'spring' },
          { id: 'kf-t1-x3', timeMs: 1600, value: 8, easing: 'spring' },
          { id: 'kf-t1-x4', timeMs: 2000, value: 8, easing: 'spring' }
        ]
      },
      width: {
        property: 'width',
        keyframes: [
          { id: 'kf-t1-w0', timeMs: 0, value: 52, easing: 'spring' },
          { id: 'kf-t1-w1', timeMs: 250, value: 62, easing: 'spring' },
          { id: 'kf-t1-w2', timeMs: 500, value: 52, easing: 'spring' },
          { id: 'kf-t1-w3', timeMs: 1100, value: 52, easing: 'spring' },
          { id: 'kf-t1-w4', timeMs: 1350, value: 62, easing: 'spring' },
          { id: 'kf-t1-w5', timeMs: 1600, value: 52, easing: 'spring' },
          { id: 'kf-t1-w6', timeMs: 2000, value: 52, easing: 'spring' }
        ]
      }
    }
  }

  // -------------------------------------------------------------
  // Card 2: "02 · Heart Reaction Pop" (x = 440, y = 190)
  // -------------------------------------------------------------
  const card2 = graph.createNode('FRAME', pageId, {
    name: '02 · Heart Pop',
    x: 440,
    y: 190,
    width: 320,
    height: 320,
    cornerRadius: 20,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.14, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.18, g: 0.18, b: 0.24, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  graph.createNode('TEXT', card2.id, {
    name: 'Card 2 Category',
    text: '02 · MICRO-INTERACTION',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    x: 24,
    y: 24,
    width: 200,
    height: 16,
    fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.25, b: 0.37, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card2.id, {
    name: 'Card 2 Title',
    text: 'Like Reaction Pop',
    fontSize: 18,
    fontWeight: 700,
    x: 24,
    y: 44,
    width: 260,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card2.id, {
    name: 'Card 2 Description',
    text: 'Scale bounce & playful rotation with floating burst spark.',
    fontSize: 11,
    fontWeight: 400,
    x: 24,
    y: 72,
    width: 260,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.55, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  // Heart Button Circle
  const heartCircle = graph.createNode('FRAME', card2.id, {
    name: 'Button Circle',
    x: 120,
    y: 165,
    width: 80,
    height: 80,
    cornerRadius: 40,
    fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22, a: 1 }, opacity: 1, visible: true }]
  })

  // Animated Heart Badge
  const heartBadge = graph.createNode('FRAME', heartCircle.id, {
    name: 'Heart Icon',
    x: 20,
    y: 20,
    width: 40,
    height: 40,
    cornerRadius: 12,
    fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.25, b: 0.37, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', heartBadge.id, {
    name: 'Heart Glyph',
    text: '♥',
    fontSize: 22,
    textAlignHorizontal: 'CENTER',
    x: 0,
    y: 8,
    width: 40,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })

  heartBadge.motionTracks = {
    nodeId: heartBadge.id,
    nodeName: heartBadge.name,
    tracks: {
      width: {
        property: 'width',
        keyframes: [
          { id: 'kf-h-w0', timeMs: 0, value: 40, easing: 'spring' },
          { id: 'kf-h-w1', timeMs: 400, value: 54, easing: 'spring' },
          { id: 'kf-h-w2', timeMs: 800, value: 40, easing: 'spring' },
          { id: 'kf-h-w3', timeMs: 1400, value: 48, easing: 'spring' },
          { id: 'kf-h-w4', timeMs: 1700, value: 40, easing: 'spring' },
          { id: 'kf-h-w5', timeMs: 2000, value: 40, easing: 'spring' }
        ]
      },
      height: {
        property: 'height',
        keyframes: [
          { id: 'kf-h-h0', timeMs: 0, value: 40, easing: 'spring' },
          { id: 'kf-h-h1', timeMs: 400, value: 54, easing: 'spring' },
          { id: 'kf-h-h2', timeMs: 800, value: 40, easing: 'spring' },
          { id: 'kf-h-h3', timeMs: 1400, value: 48, easing: 'spring' },
          { id: 'kf-h-h4', timeMs: 1700, value: 40, easing: 'spring' },
          { id: 'kf-h-h5', timeMs: 2000, value: 40, easing: 'spring' }
        ]
      },
      rotation: {
        property: 'rotation',
        keyframes: [
          { id: 'kf-h-r0', timeMs: 0, value: 0, easing: 'spring' },
          { id: 'kf-h-r1', timeMs: 400, value: -16, easing: 'spring' },
          { id: 'kf-h-r2', timeMs: 800, value: 0, easing: 'spring' },
          { id: 'kf-h-r3', timeMs: 2000, value: 0, easing: 'spring' }
        ]
      }
    }
  }

  // Floating Sparkle Particle
  const sparkle = graph.createNode('FRAME', card2.id, {
    name: 'Sparkle Particle',
    x: 152,
    y: 145,
    width: 16,
    height: 16,
    cornerRadius: 8,
    opacity: 0,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0.2, a: 1 }, opacity: 1, visible: true }]
  })
  sparkle.motionTracks = {
    nodeId: sparkle.id,
    nodeName: sparkle.name,
    tracks: {
      y: {
        property: 'y',
        keyframes: [
          { id: 'kf-sp-y0', timeMs: 0, value: 160, easing: 'ease-out' },
          { id: 'kf-sp-y1', timeMs: 400, value: 130, easing: 'ease-out' },
          { id: 'kf-sp-y2', timeMs: 800, value: 160, easing: 'ease-in' },
          { id: 'kf-sp-y3', timeMs: 2000, value: 160, easing: 'ease-in' }
        ]
      },
      opacity: {
        property: 'opacity',
        keyframes: [
          { id: 'kf-sp-op0', timeMs: 0, value: 0, easing: 'ease-out' },
          { id: 'kf-sp-op1', timeMs: 350, value: 1, easing: 'ease-out' },
          { id: 'kf-sp-op2', timeMs: 700, value: 0, easing: 'ease-in' },
          { id: 'kf-sp-op3', timeMs: 2000, value: 0, easing: 'ease-in' }
        ]
      }
    }
  }

  // -------------------------------------------------------------
  // Card 3: "03 · Dynamic Island Expand" (x = 800, y = 190)
  // -------------------------------------------------------------
  const card3 = graph.createNode('FRAME', pageId, {
    name: '03 · Dynamic Island',
    x: 800,
    y: 190,
    width: 320,
    height: 320,
    cornerRadius: 20,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.14, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.18, g: 0.18, b: 0.24, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  graph.createNode('TEXT', card3.id, {
    name: 'Card 3 Category',
    text: '03 · EXPANDABLE PILL',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    x: 24,
    y: 24,
    width: 200,
    height: 16,
    fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.65, b: 0.95, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card3.id, {
    name: 'Card 3 Title',
    text: 'Dynamic Island Morph',
    fontSize: 18,
    fontWeight: 700,
    x: 24,
    y: 44,
    width: 260,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card3.id, {
    name: 'Card 3 Description',
    text: 'Width, height and corner radius multi-axis morphing container.',
    fontSize: 11,
    fontWeight: 400,
    x: 24,
    y: 72,
    width: 260,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.55, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  // Dynamic Island Pill (Animated x, width, height, cornerRadius)
  const islandPill = graph.createNode('FRAME', card3.id, {
    name: 'Island Pill',
    x: 95,
    y: 175,
    width: 130,
    height: 44,
    cornerRadius: 22,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.04, g: 0.04, b: 0.06, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.25, g: 0.25, b: 0.35, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  // Icon inside pill
  graph.createNode('FRAME', islandPill.id, {
    name: 'Pill Indicator',
    x: 14,
    y: 12,
    width: 20,
    height: 20,
    cornerRadius: 10,
    fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.65, b: 0.95, a: 1 }, opacity: 1, visible: true }]
  })

  islandPill.motionTracks = {
    nodeId: islandPill.id,
    nodeName: islandPill.name,
    tracks: {
      x: {
        property: 'x',
        keyframes: [
          { id: 'kf-isl-x0', timeMs: 0, value: 95, easing: 'spring' },
          { id: 'kf-isl-x1', timeMs: 550, value: 35, easing: 'spring' },
          { id: 'kf-isl-x2', timeMs: 1350, value: 35, easing: 'spring' },
          { id: 'kf-isl-x3', timeMs: 1850, value: 95, easing: 'spring' },
          { id: 'kf-isl-x4', timeMs: 2000, value: 95, easing: 'spring' }
        ]
      },
      width: {
        property: 'width',
        keyframes: [
          { id: 'kf-isl-w0', timeMs: 0, value: 130, easing: 'spring' },
          { id: 'kf-isl-w1', timeMs: 550, value: 250, easing: 'spring' },
          { id: 'kf-isl-w2', timeMs: 1350, value: 250, easing: 'spring' },
          { id: 'kf-isl-w3', timeMs: 1850, value: 130, easing: 'spring' },
          { id: 'kf-isl-w4', timeMs: 2000, value: 130, easing: 'spring' }
        ]
      },
      height: {
        property: 'height',
        keyframes: [
          { id: 'kf-isl-h0', timeMs: 0, value: 44, easing: 'spring' },
          { id: 'kf-isl-h1', timeMs: 550, value: 68, easing: 'spring' },
          { id: 'kf-isl-h2', timeMs: 1350, value: 68, easing: 'spring' },
          { id: 'kf-isl-h3', timeMs: 1850, value: 44, easing: 'spring' },
          { id: 'kf-isl-h4', timeMs: 2000, value: 44, easing: 'spring' }
        ]
      }
    }
  }

  // -------------------------------------------------------------
  // Card 4: "04 · Loading Progress Rail" (x = 1160, y = 190)
  // -------------------------------------------------------------
  const card4 = graph.createNode('FRAME', pageId, {
    name: '04 · Progress Rail',
    x: 1160,
    y: 190,
    width: 320,
    height: 320,
    cornerRadius: 20,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.14, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.18, g: 0.18, b: 0.24, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  graph.createNode('TEXT', card4.id, {
    name: 'Card 4 Category',
    text: '04 · PROGRESS & LOADER',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    x: 24,
    y: 24,
    width: 200,
    height: 16,
    fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.62, b: 0.05, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card4.id, {
    name: 'Card 4 Title',
    text: 'Buffered Progress Rail',
    fontSize: 18,
    fontWeight: 700,
    x: 24,
    y: 44,
    width: 260,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card4.id, {
    name: 'Card 4 Description',
    text: 'Continuous fill interpolation with easing curve acceleration.',
    fontSize: 11,
    fontWeight: 400,
    x: 24,
    y: 72,
    width: 260,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.55, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  // Progress Rail Background
  const progressRail = graph.createNode('FRAME', card4.id, {
    name: 'Rail Track',
    x: 35,
    y: 190,
    width: 250,
    height: 16,
    cornerRadius: 8,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22, a: 1 }, opacity: 1, visible: true }]
  })

  // Animated Progress Fill
  const progressFill = graph.createNode('FRAME', progressRail.id, {
    name: 'Progress Fill',
    x: 0,
    y: 0,
    width: 20,
    height: 16,
    cornerRadius: 8,
    fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.62, b: 0.05, a: 1 }, opacity: 1, visible: true }]
  })
  progressFill.motionTracks = {
    nodeId: progressFill.id,
    nodeName: progressFill.name,
    tracks: {
      width: {
        property: 'width',
        keyframes: [
          { id: 'kf-pr-w0', timeMs: 0, value: 20, easing: 'ease-in-out' },
          { id: 'kf-pr-w1', timeMs: 600, value: 125, easing: 'ease-out' },
          { id: 'kf-pr-w2', timeMs: 1200, value: 210, easing: 'ease-in-out' },
          { id: 'kf-pr-w3', timeMs: 1650, value: 250, easing: 'ease-out' },
          { id: 'kf-pr-w4', timeMs: 1950, value: 20, easing: 'linear' },
          { id: 'kf-pr-w5', timeMs: 2000, value: 20, easing: 'linear' }
        ]
      }
    }
  }

  // -------------------------------------------------------------
  // Card 5: "05 · Gliding Tab Selector" (x = 1520, y = 190)
  // -------------------------------------------------------------
  const card5 = graph.createNode('FRAME', pageId, {
    name: '05 · Tab Glider',
    x: 1520,
    y: 190,
    width: 320,
    height: 320,
    cornerRadius: 20,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.14, a: 1 }, opacity: 1, visible: true }],
    strokes: [
      {
        color: { r: 0.18, g: 0.18, b: 0.24, a: 1 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]
  })

  graph.createNode('TEXT', card5.id, {
    name: 'Card 5 Category',
    text: '05 · NAVIGATION PILL',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    x: 24,
    y: 24,
    width: 200,
    height: 16,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.36, b: 0.96, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card5.id, {
    name: 'Card 5 Title',
    text: 'Segmented Pill Glider',
    fontSize: 18,
    fontWeight: 700,
    x: 24,
    y: 44,
    width: 260,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', card5.id, {
    name: 'Card 5 Description',
    text: 'Smooth spring glide across active navigation states.',
    fontSize: 11,
    fontWeight: 400,
    x: 24,
    y: 72,
    width: 260,
    height: 32,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.55, b: 0.65, a: 1 }, opacity: 1, visible: true }]
  })

  // Segmented Container
  const tabContainer = graph.createNode('FRAME', card5.id, {
    name: 'Segmented Container',
    x: 25,
    y: 175,
    width: 270,
    height: 52,
    cornerRadius: 26,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22, a: 1 }, opacity: 1, visible: true }]
  })

  // Active Glider Pill (Animated x)
  const gliderPill = graph.createNode('FRAME', tabContainer.id, {
    name: 'Active Glider',
    x: 6,
    y: 6,
    width: 82,
    height: 40,
    cornerRadius: 20,
    fills: [{ type: 'SOLID', color: { r: 0.55, g: 0.36, b: 0.96, a: 1 }, opacity: 1, visible: true }]
  })
  gliderPill.motionTracks = {
    nodeId: gliderPill.id,
    nodeName: gliderPill.name,
    tracks: {
      x: {
        property: 'x',
        keyframes: [
          { id: 'kf-gl-x0', timeMs: 0, value: 6, easing: 'spring' },
          { id: 'kf-gl-x1', timeMs: 650, value: 94, easing: 'spring' },
          { id: 'kf-gl-x2', timeMs: 1300, value: 182, easing: 'spring' },
          { id: 'kf-gl-x3', timeMs: 1800, value: 6, easing: 'spring' },
          { id: 'kf-gl-x4', timeMs: 2000, value: 6, easing: 'spring' }
        ]
      }
    }
  }

  // Tab Labels (Static on top of container)
  const tabLabels = ['Design', 'Motion', 'Code']
  tabLabels.forEach((lbl, idx) => {
    graph.createNode('TEXT', tabContainer.id, {
      name: `Tab Label - ${lbl}`,
      text: lbl,
      fontSize: 12,
      fontWeight: 600,
      textAlignHorizontal: 'CENTER',
      x: 6 + idx * 88,
      y: 18,
      width: 82,
      height: 18,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
  })

  return graph
}

export const HOME_TEMPLATES: HomeTemplate[] = [
  {
    id: 'figma-motion',
    name: '5 Easy Figma Motion (Community)',
    category: 'Motion',
    description:
      '5 easy micro-interactions & timeline animations with Figma Motion layout and keyframes',
    tag: 'Figma Motion',
    accentColor: '#3ece80',
    createGraph: createFigmaMotionTemplate
  },
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
