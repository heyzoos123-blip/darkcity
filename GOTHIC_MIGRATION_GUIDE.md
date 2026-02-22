# Gothic Migration Guide - Component Transformations

A practical guide showing how to convert cyberpunk components to gothic style.

---

## 🔄 Button Transformations

### Before: Cyberpunk Button
```tsx
<button className="bg-accent-primary hover:bg-accent-primary/80 text-background-primary 
                   px-6 py-3 rounded-lg font-display font-bold
                   shadow-glow-primary hover:shadow-glow-primary
                   transition-all duration-200">
  Access Terminal
</button>
```

### After: Gothic Stone Button
```tsx
<button className="stone-button px-6 py-3 font-display text-accent-gold 
                   hover:text-accent-amber transition-all">
  Enter Chamber
</button>
```

**Key Changes:**
- Remove: rounded corners, neon glow shadows
- Add: `.stone-button` class (embossed stone appearance)
- Colors: neon green → antique gold
- Text: modern → victorian phrasing

---

## 🎴 Card Transformations

### Before: Glass Morphism Card
```tsx
<div className="glass rounded-xl p-6 backdrop-blur-xl bg-background-overlay 
               border border-text-muted/20">
  <h3 className="font-display text-xl text-accent-primary glow-text mb-3">
    System Alert
  </h3>
  <p className="font-body text-text-secondary">
    New data packet received
  </p>
</div>
```

### After: Parchment Scroll Card
```tsx
<div className="parchment torn-edge p-6 relative shadow-candlelight">
  <div className="wax-seal absolute -top-5 -right-5"></div>
  <h3 className="font-display text-xl text-accent-crimson mb-3">
    Royal Decree
  </h3>
  <p className="font-body text-text-secondary leading-relaxed">
    A new proclamation has been issued
  </p>
</div>
```

**Key Changes:**
- Replace: `.glass` → `.parchment` + `.torn-edge`
- Add: `.wax-seal` decoration
- Remove: rounded corners, backdrop blur
- Colors: neon green → blood red
- Shadow: glow → candlelight

---

## 📊 Panel Transformations

### Before: Neon Data Panel
```tsx
<div className="glass-strong rounded-lg p-8 border-2 border-accent-primary/30
               shadow-glow-primary">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse"></div>
    <h2 className="font-display text-2xl text-text-primary">
      Network Status
    </h2>
  </div>
  <div className="font-mono text-accent-secondary">
    ONLINE
  </div>
</div>
```

### After: Gothic Stone Panel
```tsx
<div className="glass gothic-arch p-8 border-2 border-accent-gold/40
               shadow-stone">
  <div className="flex items-center gap-3 mb-4">
    <svg className="w-6 h-6 text-accent-amber animate-torch-flicker">
      <use href="/gothic/icons.svg#icon-torch" />
    </svg>
    <h2 className="font-display text-2xl text-accent-gold">
      Cathedral Status
    </h2>
  </div>
  <div className="font-body text-accent-amber">
    Gates Open
  </div>
</div>
```

**Key Changes:**
- Keep: `.glass` (now stone-textured)
- Add: `.gothic-arch` shape
- Replace: pulse dot → torch icon
- Animation: pulse → flicker
- Font: mono → serif body
- Colors: neon → gold/amber

---

## 🗺️ Map Marker Transformations

### Before: Neon Marker
```tsx
<div className="w-12 h-12 rounded-full bg-accent-primary/20 
               border-2 border-accent-primary
               shadow-glow-primary animate-pulse
               flex items-center justify-center">
  <div className="w-6 h-6 rounded-full bg-accent-primary"></div>
</div>
```

### After: Gothic Icon Marker
```tsx
<div className="relative">
  <svg className="w-12 h-12 text-accent-amber animate-torch-flicker
                 drop-shadow-[0_0_12px_rgba(255,165,0,0.6)]">
    <use href="/gothic/icons.svg#icon-torch" />
  </svg>
</div>
```

**Key Changes:**
- Remove: circles, neon borders
- Add: SVG gothic icon
- Animation: pulse → torch-flicker
- Glow: neon green → warm amber
- Style: geometric → ornate symbol

---

## 📝 Typography Transformations

### Before: Cyberpunk Headers
```tsx
<h1 className="font-display text-6xl text-accent-primary glow-text
               tracking-wider uppercase">
  DARKCITY
</h1>
```

### After: Gothic Headers
```tsx
<h1 className="font-display text-6xl text-accent-gold glow-gold
               tracking-wide">
  DarkCity
</h1>
```

**Key Changes:**
- Font: Space Grotesk → Cinzel (auto via Tailwind)
- Color: neon green → antique gold
- Glow: sharp neon → warm candlelight
- Case: ALL CAPS → Title Case
- Tracking: wider → wide (more elegant)

### Before: Body Text
```tsx
<p className="font-body text-base text-text-secondary leading-normal">
  Access the mainframe to retrieve data.
</p>
```

### After: Body Text
```tsx
<p className="font-body text-base text-text-secondary leading-relaxed">
  Enter the archives to discover ancient secrets.
</p>
```

**Key Changes:**
- Font: Inter → EB Garamond (auto via Tailwind)
- Leading: normal → relaxed (more readable for serif)
- Language: tech jargon → victorian phrasing

---

## 🎨 Color Class Replacements

### Quick Reference Table

| Before (Cyberpunk) | After (Gothic) |
|-------------------|----------------|
| `text-accent-primary` (neon green) | `text-accent-crimson` (blood red) |
| `text-accent-secondary` (neon pink) | `text-accent-gold` (antique gold) |
| `bg-accent-primary` | `bg-accent-crimson` |
| `border-accent-primary` | `border-accent-gold` |
| `shadow-glow-primary` | `shadow-candlelight` |
| `shadow-glow-secondary` | `shadow-torch` |
| `animate-pulse` | `animate-flicker` |
| `animate-glow` | `animate-torch-flicker` |

---

## 🎭 Animation Replacements

### Before: Scan Line Animation
```tsx
<div className="animate-scan absolute inset-0 bg-gradient-to-b 
               from-transparent via-accent-primary/20 to-transparent"></div>
```

### After: Torch Flicker
```tsx
<div className="animate-flicker">
  <svg className="w-8 h-8 text-accent-amber">
    <use href="/gothic/icons.svg#icon-torch" />
  </svg>
</div>
```

### Before: Glitch Effect
```tsx
<h2 className="glitch text-accent-primary">ERROR</h2>
```

### After: Mystical Float
```tsx
<h2 className="animate-float text-accent-amber glow-text">Prophecy</h2>
```

---

## 🖼️ Icon Transformations

### Before: Geometric Icons
```tsx
// Using lucide-react or similar
import { Database, Zap, Terminal } from 'lucide-react'

<Database className="w-6 h-6 text-accent-primary" />
<Zap className="w-6 h-6 text-accent-secondary" />
<Terminal className="w-6 h-6 text-text-primary" />
```

### After: Gothic SVG Icons
```tsx
<svg className="w-6 h-6 text-accent-crimson">
  <use href="/gothic/icons.svg#icon-skull" />
</svg>
<svg className="w-6 h-6 text-accent-amber animate-torch-flicker">
  <use href="/gothic/icons.svg#icon-torch" />
</svg>
<svg className="w-6 h-6 text-text-primary">
  <use href="/gothic/icons.svg#icon-cross" />
</svg>
```

**Icon Mapping:**
- Database → Skull (knowledge)
- Zap/Lightning → Torch (energy)
- Terminal → Cross (interface/portal)
- User → Gargoyle (entity)
- Alert → Raven (message)
- Lock → Gate (security)
- Star → Seal (importance)

---

## 🎨 Background Transformations

### Before: Grid Pattern
```tsx
<div className="bg-background-primary bg-grid-pattern">
  Content
</div>
```

### After: Stone Texture
```tsx
<div className="bg-background-primary bg-stone-texture">
  Content
</div>
```

### Before: Gradient Glow
```tsx
<div className="bg-gradient-to-br from-background-primary 
               via-accent-primary/10 to-background-secondary">
  Content
</div>
```

### After: Gothic Gradient
```tsx
<div className="bg-gothic-gradient">
  Content
</div>
```

---

## 📱 Form Input Transformations

### Before: Neon Input
```tsx
<input 
  type="text"
  className="bg-background-secondary border-2 border-accent-primary/30
            focus:border-accent-primary rounded-lg px-4 py-2
            font-mono text-text-primary placeholder-text-muted
            shadow-glow-primary focus:shadow-glow-primary"
  placeholder="Enter access code..."
/>
```

### After: Gothic Input
```tsx
<input 
  type="text"
  className="bg-parchment-texture border-2 border-border
            focus:border-accent-gold rounded-none px-4 py-2
            font-body text-[#2a1810] placeholder-text-muted
            shadow-embossed focus:shadow-torch"
  placeholder="Inscribe thy name..."
/>
```

**Key Changes:**
- Background: dark → parchment texture
- Border: neon → aged iron → gold on focus
- Shape: rounded → sharp corners
- Font: mono → serif
- Shadow: neon glow → embossed → torch on focus
- Language: modern → archaic

---

## 🎯 Complete Component Example

### Before: Cyberpunk Dashboard Widget
```tsx
export function CyberWidget() {
  return (
    <div className="glass-strong rounded-xl p-6 border border-accent-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse"></div>
          <h3 className="font-display text-lg text-text-primary uppercase">
            SYSTEM MONITOR
          </h3>
        </div>
        <Terminal className="w-5 h-5 text-accent-secondary" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between font-mono text-sm">
          <span className="text-text-secondary">CPU:</span>
          <span className="text-accent-primary">87%</span>
        </div>
        <div className="flex justify-between font-mono text-sm">
          <span className="text-text-secondary">Memory:</span>
          <span className="text-accent-secondary">12.4 GB</span>
        </div>
      </div>
      
      <button className="w-full mt-4 bg-accent-primary hover:bg-accent-primary/80 
                        text-background-primary font-display font-bold py-2 rounded-lg
                        shadow-glow-primary transition-all">
        ACCESS
      </button>
    </div>
  );
}
```

### After: Gothic Cathedral Widget
```tsx
export function GothicWidget() {
  return (
    <div className="glass gothic-arch p-6 border-2 border-accent-gold/40 shadow-stone">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-accent-amber animate-torch-flicker">
            <use href="/gothic/icons.svg#icon-torch" />
          </svg>
          <h3 className="font-display text-lg text-accent-gold">
            Chapel Monitor
          </h3>
        </div>
        <svg className="w-5 h-5 text-accent-crimson">
          <use href="/gothic/icons.svg#icon-cross" />
        </svg>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between font-body text-sm">
          <span className="text-text-secondary">Candlelight:</span>
          <span className="text-accent-amber">Bright</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-text-secondary">Congregation:</span>
          <span className="text-accent-gold">87 souls</span>
        </div>
      </div>
      
      <button className="w-full mt-4 stone-button py-2 font-display text-accent-gold
                        hover:text-accent-amber transition-all">
        Enter
      </button>
    </div>
  );
}
```

---

## 📋 Migration Checklist

### For Each Component:

- [ ] Replace glass morphism classes with stone/parchment variants
- [ ] Change all fonts to serif (display/body)
- [ ] Replace neon colors with gothic palette (crimson, gold, amber)
- [ ] Remove rounded corners (use sharp edges or gothic arches)
- [ ] Replace geometric icons with gothic SVG symbols
- [ ] Change pulse animations to flicker/float
- [ ] Update shadows from neon glow to candlelight/torch
- [ ] Modify language from tech jargon to victorian phrasing
- [ ] Add decorative elements (wax seals, ornaments)
- [ ] Update borders from thin neon to ornate filigree

### Text Replacements:

| Cyberpunk | Gothic |
|-----------|--------|
| "Access" | "Enter" |
| "Terminal" | "Chamber" / "Hall" |
| "System" | "Cathedral" / "Chapel" |
| "Network" | "Council" |
| "Data" | "Archives" / "Scrolls" |
| "Alert" | "Decree" / "Proclamation" |
| "Online" | "Open" / "Awakened" |
| "Error" | "Curse" / "Affliction" |

---

## 🎨 Testing Your Transformation

### Visual Checklist:
1. **No rounded corners** (except gothic arches)
2. **No sans-serif fonts** (all Cinzel/EB Garamond/Crimson Text)
3. **No neon colors** (only crimson, gold, amber, purple)
4. **No bright glows** (only warm candlelight)
5. **Textures visible** (stone, parchment, iron)
6. **Gothic icons** (no geometric shapes)
7. **Ornate details** (filigree, wax seals, corners)
8. **Victorian language** (no tech jargon)

### Does it feel like:
- ✅ Exploring a Victorian cathedral at midnight
- ✅ Reading ancient scrolls by candlelight
- ✅ Walking cobblestone streets in fog
- ❌ Hacking a computer terminal
- ❌ Navigating a sci-fi interface

If any ❌ items feel true, keep transforming!

---

**Remember:** We're going from The Matrix to Bloodborne. Dark, ornate, Victorian, supernatural. 🏰🌙🕯️
