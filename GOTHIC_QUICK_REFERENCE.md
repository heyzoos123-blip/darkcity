# Gothic Quick Reference - DARKCITY

Quick copy-paste examples for the gothic aesthetic.

---

## 🎨 Color Classes

### Backgrounds
```tsx
className="bg-background-primary"      // #0a0a14 deep purple-black
className="bg-background-secondary"    // #12091a darker
className="bg-background-elevated"     // #2d1b4e royal purple
```

### Accents
```tsx
className="text-accent-crimson"        // #8b0000 blood red
className="text-accent-gold"           // #d4af37 antique gold
className="text-accent-amber"          // #ffa500 torch amber
className="border-accent-gold"         // gold borders
```

### Text
```tsx
className="text-text-primary"          // #e8dcc4 aged parchment
className="text-text-secondary"        // #c4b5a0 faded parchment
className="text-text-muted"            // #8b7e6a old paper
```

---

## 📝 Typography

### Headers (Cinzel)
```tsx
<h1 className="font-display text-4xl text-accent-gold glow-gold">
  The Dark City
</h1>
```

### Body Text (EB Garamond)
```tsx
<p className="font-body text-lg text-text-primary leading-relaxed">
  Ancient streets wind through shadows...
</p>
```

### Monospace (Courier)
```tsx
<code className="font-mono text-sm text-accent-amber">
  0xDEADBEEF
</code>
```

---

## 🎭 Gothic Components

### Stone Button
```tsx
<button className="stone-button px-8 py-4 font-display text-lg text-accent-gold hover:text-accent-amber transition-all">
  Enter Cathedral
</button>
```

### Parchment Card
```tsx
<div className="parchment torn-edge p-8 relative shadow-candlelight">
  <div className="wax-seal absolute -top-5 -right-5"></div>
  <h3 className="font-display text-2xl text-accent-crimson mb-4">
    Notice
  </h3>
  <p className="font-body text-base leading-relaxed">
    The gates of DARKCITY close at dusk. All visitors must register with the keeper.
  </p>
</div>
```

### Glass Panel (Stone Texture)
```tsx
<div className="glass p-6 rounded-sm border-2 border-accent-gold/30 backdrop-blur-sm">
  <h4 className="font-display text-xl text-accent-gold mb-2">
    District Overview
  </h4>
  <div className="font-body text-text-secondary">
    Population: 12,847
  </div>
</div>
```

### Gothic Arch Panel
```tsx
<div className="gothic-arch bg-background-elevated p-6 border-2 border-accent-gold/40 shadow-stone">
  <div className="font-display text-center text-accent-amber">
    Cathedral District
  </div>
</div>
```

---

## ✨ Glow Effects

### Torch Glow (Amber)
```tsx
<span className="glow-text text-accent-amber">
  🕯 Candlelight
</span>
```

### Crimson Glow (Blood Red)
```tsx
<span className="glow-crimson text-accent-crimson">
  ⚔ Danger
</span>
```

### Gold Glow (Antique)
```tsx
<span className="glow-gold text-accent-gold">
  ⚜ Royal Decree
</span>
```

---

## 🎯 Gothic Icons

### Using Icons
```tsx
<svg className="w-8 h-8 text-accent-amber animate-torch-flicker">
  <use href="/gothic/icons.svg#icon-torch" />
</svg>

<svg className="w-6 h-6 text-accent-crimson">
  <use href="/gothic/icons.svg#icon-cross" />
</svg>

<svg className="w-10 h-10 text-text-muted">
  <use href="/gothic/icons.svg#icon-gargoyle" />
</svg>
```

### Available Icons
- `icon-cross` - Gothic cross
- `icon-gargoyle` - Guardian creature
- `icon-raven` - Mystical bird
- `icon-skull` - Memento mori
- `icon-torch` - Flickering flame
- `icon-window` - Cathedral window
- `icon-seal` - Wax seal
- `icon-gate` - Iron gate
- `icon-candelabra` - Candle holder
- `icon-cobblestone` - Street texture

---

## 🎨 Animations

### Torch Flicker
```tsx
<div className="animate-flicker">
  Flickering torchlight
</div>
```

### Mystical Float
```tsx
<div className="animate-float">
  🌙 Floating moonlight
</div>
```

### Torch Glow Animation
```tsx
<svg className="animate-torch-flicker text-accent-amber">
  <use href="/gothic/icons.svg#icon-torch" />
</svg>
```

---

## 🖼️ Ornate Borders

### Filigree Border
```tsx
<div className="filigree-border p-6">
  Content with ornate gold border
</div>
```

### Stone Frame
```tsx
<div className="border-4 border-border shadow-stone bg-background-elevated p-8">
  Carved stone appearance
</div>
```

---

## 🗺️ Map-Specific Classes

### Stone Map Controls
```css
/* Automatically styled in map.css */
.leaflet-control-zoom a
```

### Parchment Tooltips
```css
/* Automatically styled in map.css */
.leaflet-popup-content-wrapper
```

### District Markers
```tsx
<svg className="w-12 h-12 text-district-downtown animate-float">
  <use href="/gothic/icons.svg#icon-window" />
</svg>
```

---

## 🎨 District Color Classes

### Jewel Tones
```tsx
className="text-district-downtown"     // #4b0082 indigo (royal)
className="text-district-industrial"   // #8b0000 crimson (blood)
className="text-district-arts"         // #9370db purple (mystical)
className="text-district-residential"  // #2f4f4f slate (somber)
className="text-district-underground"  // #800020 burgundy (shadows)
className="text-district-uptown"       // #d4af37 gold (wealthy)
```

---

## 📜 Complete Page Example

```tsx
export default function GothicPage() {
  return (
    <div className="min-h-screen bg-background-primary p-8">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="font-display text-6xl text-accent-gold glow-gold mb-4">
          DARKCITY
        </h1>
        <p className="font-body text-xl text-text-secondary italic">
          Where shadows dance with candlelight
        </p>
      </header>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* Parchment Card */}
        <div className="parchment torn-edge p-8 relative">
          <div className="wax-seal absolute -top-5 -right-5"></div>
          <h2 className="font-display text-2xl text-accent-crimson mb-4">
            City Charter
          </h2>
          <p className="font-body leading-relaxed">
            By decree of the Council, all who enter these gates must abide by the ancient laws...
          </p>
        </div>

        {/* Stone Panel */}
        <div className="glass gothic-arch p-8 border-2 border-accent-gold/40">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-8 h-8 text-accent-amber animate-torch-flicker">
              <use href="/gothic/icons.svg#icon-torch" />
            </svg>
            <h2 className="font-display text-2xl text-accent-gold">
              Cathedral District
            </h2>
          </div>
          <p className="font-body text-text-secondary">
            The heart of spiritual life, where Gothic spires pierce the eternal twilight.
          </p>
        </div>

      </div>

      {/* Button */}
      <div className="text-center mt-12">
        <button className="stone-button px-12 py-4 font-display text-xl text-accent-gold hover:text-accent-amber">
          Explore the Districts
        </button>
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Custom Classes

Add these to your component for quick gothic styling:

```css
/* Gothic panel with ornate corners */
.gothic-panel {
  @apply glass p-8 relative;
  @apply border-2 border-accent-gold/30;
  @apply shadow-candlelight;
}

/* Weathered text effect */
.weathered-text {
  @apply text-text-primary;
  filter: contrast(0.9) brightness(0.95);
  letter-spacing: 0.02em;
}

/* Torch-lit container */
.torchlit {
  background: radial-gradient(
    circle at top,
    rgba(255, 165, 0, 0.1) 0%,
    transparent 60%
  );
}

/* Iron frame */
.iron-frame {
  @apply border-4 border-border;
  @apply shadow-embossed;
  box-shadow: 
    inset 0 2px 0 rgba(212, 175, 55, 0.2),
    inset 0 -2px 0 rgba(0, 0, 0, 0.4);
}
```

---

## 🌙 Pro Tips

1. **Layer textures:** Combine stone backgrounds with parchment overlays
2. **Use animations sparingly:** Torch flicker for important elements only
3. **Gothic arch shapes:** Great for headers, doorways, windows
4. **Warm glows:** Always use amber/gold for light sources
5. **Deep shadows:** Don't be afraid of darkness - it creates atmosphere
6. **Ornate details:** Wax seals, corner ornaments, filigree borders
7. **Serif everywhere:** No sans-serif fonts in gothic DARKCITY

---

**Remember:** We're creating Bloodborne meets Penny Dreadful. Dark, Victorian, supernatural, atmospheric. 🏰🌙🕯️
