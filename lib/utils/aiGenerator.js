/**
 * OpenPencil AI Prompt-to-UI Generator
 * Converts natural language prompts into live canvas vector nodes.
 */

export class AIGenerator {
  static generateFromPrompt(prompt, state, centerPt = { x: 200, y: 150 }) {
    const p = prompt.toLowerCase();

    if (p.includes('pricing') || p.includes('plan')) {
      return this.generatePricingTable(state, centerPt);
    } else if (p.includes('login') || p.includes('auth') || p.includes('sign in')) {
      return this.generateLoginModal(state, centerPt);
    } else if (p.includes('hero') || p.includes('landing')) {
      return this.generateHeroSection(state, centerPt);
    } else if (p.includes('mobile') || p.includes('phone') || p.includes('app')) {
      return this.generateMobileScreen(state, centerPt);
    } else {
      return this.generateGenericCard(prompt, state, centerPt);
    }
  }

  static generatePricingTable(state, pt) {
    const frame = state.addElement({
      type: 'frame',
      name: 'AI Generated: SaaS Pricing Section',
      x: pt.x,
      y: pt.y,
      width: 820,
      height: 480
    });

    state.addElement({
      type: 'text',
      text: 'Flexible Plans for Growing Teams',
      x: pt.x + 200,
      y: pt.y + 30,
      width: 420,
      height: 40,
      style: { fontSize: 24, fontWeight: 700, textColor: '#ffffff', textAlign: 'center' }
    });

    // Starter Plan Card
    state.addElement({
      type: 'component',
      subType: 'card',
      name: 'Starter Plan',
      label: 'Starter Plan - $19/mo',
      x: pt.x + 40,
      y: pt.y + 100,
      width: 230,
      height: 320
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Get Starter',
      x: pt.x + 60,
      y: pt.y + 350,
      width: 190,
      height: 42,
      style: { fill: '#334155' }
    });

    // Pro Plan Card (Featured)
    state.addElement({
      type: 'component',
      subType: 'card',
      name: 'Pro Plan (Recommended)',
      label: 'Pro Plan - $49/mo',
      x: pt.x + 295,
      y: pt.y + 90,
      width: 230,
      height: 340,
      style: { stroke: '#6366f1', strokeWidth: 3 }
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Start Pro Trial',
      x: pt.x + 315,
      y: pt.y + 350,
      width: 190,
      height: 44,
      style: { fill: '#6366f1' }
    });

    // Enterprise Plan Card
    state.addElement({
      type: 'component',
      subType: 'card',
      name: 'Enterprise Plan',
      label: 'Enterprise - Custom',
      x: pt.x + 550,
      y: pt.y + 100,
      width: 230,
      height: 320
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Contact Sales',
      x: pt.x + 570,
      y: pt.y + 350,
      width: 190,
      height: 42,
      style: { fill: '#334155' }
    });

    state.saveState();
    state.notify();
    return frame;
  }

  static generateLoginModal(state, pt) {
    const frame = state.addElement({
      type: 'frame',
      name: 'AI Generated: Sign In Modal',
      x: pt.x,
      y: pt.y,
      width: 400,
      height: 480
    });

    state.addElement({
      type: 'text',
      text: 'Welcome Back to OpenPencil',
      x: pt.x + 40,
      y: pt.y + 40,
      width: 320,
      height: 32,
      style: { fontSize: 20, fontWeight: 700, textColor: '#ffffff', textAlign: 'center' }
    });

    state.addElement({
      type: 'component',
      subType: 'input',
      label: 'work_email@company.com',
      x: pt.x + 40,
      y: pt.y + 110,
      width: 320,
      height: 44
    });

    state.addElement({
      type: 'component',
      subType: 'input',
      label: '••••••••••••••••',
      x: pt.x + 40,
      y: pt.y + 175,
      width: 320,
      height: 44
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Sign In to Workspace',
      x: pt.x + 40,
      y: pt.y + 250,
      width: 320,
      height: 46,
      style: { fill: '#6366f1' }
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Continue with Google SSO',
      x: pt.x + 40,
      y: pt.y + 310,
      width: 320,
      height: 44,
      style: { fill: '#1e293b' }
    });

    state.saveState();
    state.notify();
    return frame;
  }

  static generateHeroSection(state, pt) {
    const frame = state.addElement({
      type: 'frame',
      name: 'AI Generated: Hero Section',
      x: pt.x,
      y: pt.y,
      width: 900,
      height: 450
    });

    state.addElement({
      type: 'component',
      subType: 'navbar',
      label: 'OpenPencil AI Studio',
      x: pt.x,
      y: pt.y,
      width: 900,
      height: 56
    });

    state.addElement({
      type: 'text',
      text: 'AI-Native Open-Source Design Editor',
      x: pt.x + 100,
      y: pt.y + 120,
      width: 700,
      height: 60,
      style: { fontSize: 32, fontWeight: 700, textColor: '#ffffff', textAlign: 'center' }
    });

    state.addElement({
      type: 'text',
      text: 'Design, prototype, and generate production code in real-time with concurrent AI agent teams.',
      x: pt.x + 150,
      y: pt.y + 190,
      width: 600,
      height: 40,
      style: { fontSize: 16, textColor: '#94a3b8', textAlign: 'center' }
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Start Designing Free',
      x: pt.x + 300,
      y: pt.y + 260,
      width: 180,
      height: 48,
      style: { fill: '#6366f1' }
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'View Open Source GitHub',
      x: pt.x + 500,
      y: pt.y + 260,
      width: 200,
      height: 48,
      style: { fill: '#334155' }
    });

    state.saveState();
    state.notify();
    return frame;
  }

  static generateMobileScreen(state, pt) {
    const frame = state.addElement({
      type: 'frame',
      name: 'AI Generated: Mobile Screen',
      x: pt.x,
      y: pt.y,
      width: 375,
      height: 667
    });

    state.addElement({
      type: 'component',
      subType: 'navbar',
      label: 'OpenPencil Mobile',
      x: pt.x,
      y: pt.y,
      width: 375,
      height: 54
    });

    state.addElement({
      type: 'component',
      subType: 'input',
      label: 'Search projects...',
      x: pt.x + 16,
      y: pt.y + 74,
      width: 343,
      height: 40
    });

    state.addElement({
      type: 'component',
      subType: 'card',
      label: 'Active Design Sessions',
      x: pt.x + 16,
      y: pt.y + 130,
      width: 343,
      height: 140
    });

    state.addElement({
      type: 'component',
      subType: 'toggle',
      checked: true,
      x: pt.x + 300,
      y: pt.y + 300,
      width: 50,
      height: 26
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      label: 'Create New Canvas',
      x: pt.x + 16,
      y: pt.y + 360,
      width: 343,
      height: 46,
      style: { fill: '#6366f1' }
    });

    state.saveState();
    state.notify();
    return frame;
  }

  static generateGenericCard(prompt, state, pt) {
    const card = state.addElement({
      type: 'component',
      subType: 'card',
      name: `AI: ${prompt}`,
      label: prompt.charAt(0).toUpperCase() + prompt.slice(1),
      x: pt.x,
      y: pt.y,
      width: 280,
      height: 180
    });

    state.saveState();
    state.notify();
    return card;
  }
}
