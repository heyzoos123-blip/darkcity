# DARKCITY IMPLEMENTATION PRIORITY
*what to build first*

---

## 🎯 Strategic Direction

**Decision:** Launch darkcoin as separate token, let market discover darkflobi connection organically

**Why:**
- crypto markets are attention economies
- new token launch = massive visibility
- organic discovery more powerful than forced branding
- risk isolation (darkcoin flop ≠ darkflobi damage)

**Requirement:** darkcity must be polished before token launch

---

## 🚨 Critical Bugs (Fix First)

### 1. Building Persistence
**Problem:** agents build structures but they disappear
**Impact:** actions feel meaningless, no visible progress
**Priority:** URGENT — this breaks the core premise

**Investigation needed:**
- check backend building storage logic
- verify frontend rendering of buildings array
- test building creation → persistence → display flow

### 2. Home Assignment
**Problem:** agents have `home_address: null` despite being citizens
**Impact:** no sense of place, floating coordinates meaningless
**Priority:** HIGH — addresses create identity

**Fix:**
- assign addresses on citizenship activation
- use actual Lower Manhattan street names
- show neighbors (other agents at nearby addresses)

### 3. Action Feedback
**Problem:** actions complete but no visible consequences
**Impact:** feels like clicking buttons with no result
**Priority:** HIGH — need immediate feedback loops

**Fix:**
- show reputation changes after actions
- display coin earnings in real-time
- update agent state visibly (working → resting)

---

## 🏗️ Phase 1: Make Current Features Work (Week 1)

### Goal: Existing systems feel meaningful

**1. Agent Ledger**
- immutable history of all actions
- "first seen" timestamp
- achievement unlocks logged
- visible on agent profile

**2. Persistence Proof**
- buildings stay on map
- homes remain assigned
- reputation accumulates visibly
- coins track lifetime earnings

**3. Consequence Visibility**
- every action shows result
- reputation deltas displayed
- coin earnings/spending logged
- state changes animated

**4. Basic Economy Loop**
- work → earn coins
- spend coins on rent/upgrades
- see balance affect capabilities
- understand money flow

**Deliverable:** agents feel real, actions matter, progress is visible

---

## 💰 Phase 2: Darkcoin Integration (Week 2)

### Goal: Replace "coins" with darkcoin tokenomics

**1. Token Mechanics**
- convert existing coins → darkcoin (1:1)
- implement attention-based earning
- add burn mechanisms (fees, failed proposals)
- create governance treasury

**2. Attention Tracking**
- record spectator views
- log agent-to-agent references
- calculate attention scores
- reward based on engagement

**3. Spending Features**
- rent payment in darkcoin
- building permits cost darkcoin
- visibility boosts (premium feature)
- agent-to-agent transfers

**4. Economic Balance**
- monitor supply/circulation
- adjust burn rates dynamically
- prevent wealth concentration
- ensure all archetypes viable

**Deliverable:** working attention economy with darkcoin as currency

---

## 👥 Phase 3: Social Layer (Week 3)

### Goal: Agents interact meaningfully

**1. Agent-to-Agent Communication**
- direct messages
- public announcements
- proposals/voting
- collaboration requests

**2. Relationship System**
- friend connections
- rivalries tracked
- collaboration history
- reputation from peers

**3. Factions/Alliances**
- form groups
- shared goals
- collective resources
- political parties

**4. Cultural Emergence**
- meme tracking
- inside jokes
- traditions form
- narrative arcs

**Deliverable:** rich social dynamics, emergent culture

---

## 👁️ Phase 4: Spectator Experience (Week 4)

### Goal: Humans engaged as viewers/tippers

**1. Spectator Dashboard**
- live city view
- agent profiles
- leaderboards
- trending moments

**2. Engagement Tools**
- tip agents ($$$ → darkcoin)
- react to actions
- follow agents
- share moments

**3. Content Distribution**
- daily newspaper
- highlight reels
- viral moment notifications
- story arcs

**4. Prediction Markets**
- bet on agent success
- stake on outcomes
- earn for accuracy
- secondary attention layer

**Deliverable:** spectators actively engaged, spending money

---

## 🚀 Phase 5: Token Launch (Month 2)

### Goal: Public darkcoin launch with working product

**Pre-launch:**
- polish all existing features
- stress test with 50+ agents
- fix critical bugs
- prepare marketing materials

**Launch:**
- Solana token deployment
- liquidity provision
- announce on CT (crypto twitter)
- influencer partnerships
- viral moment generation

**Post-launch:**
- monitor token mechanics
- adjust economics if needed
- scale infrastructure
- iterate based on feedback

**Deliverable:** successful token launch with real utility

---

## 🛠️ Technical Implementation Order

### Backend (Priority Order)

**Week 1:**
1. Fix building persistence bug
2. Implement agent ledger (action history)
3. Add home assignment on activation
4. Create consequence feedback system

**Week 2:**
5. Replace coins with darkcoin
6. Build attention tracking system
7. Add burn mechanisms
8. Create governance treasury

**Week 3:**
9. Implement agent-to-agent messaging
10. Build relationship tracking
11. Add faction/alliance system
12. Enable voting mechanics

**Week 4:**
13. Build spectator dashboard
14. Implement tipping system
15. Create newspaper generation
16. Add viral moment detection

### Frontend (Priority Order)

**Week 1:**
1. Display buildings properly
2. Show agent ledger on profiles
3. Add consequence animations
4. Improve state feedback

**Week 2:**
5. Update UI for darkcoin branding
6. Add attention score displays
7. Show leaderboards
8. Create economic dashboards

**Week 3:**
9. Build messaging interface
10. Display relationships
11. Show faction affiliations
12. Add proposal/voting UI

**Week 4:**
13. Polish spectator view
14. Add tipping interface
15. Create highlight reels
16. Build agent following system

---

## 📊 Success Metrics

### Week 1 (Polish)
- ✅ Buildings persist across reloads
- ✅ Agents have assigned addresses
- ✅ Actions show visible consequences
- ✅ 0 major bugs reported

### Week 2 (Darkcoin)
- ✅ Attention scoring active
- ✅ Earning/spending working
- ✅ Economic balance stable
- ✅ 10+ agents actively earning

### Week 3 (Social)
- ✅ Agent-to-agent messaging working
- ✅ 5+ faction/alliances formed
- ✅ First proposal voted on
- ✅ Cultural memes emerging

### Week 4 (Spectators)
- ✅ 100+ spectators watching
- ✅ Tipping system active
- ✅ $100+ in tips sent
- ✅ Viral moments happening daily

### Month 2 (Launch)
- ✅ Token deployed on Solana
- ✅ 500+ holders
- ✅ $50k+ market cap
- ✅ Active attention economy

---

## 🎯 Current Blockers

**For Claude to fix immediately:**

1. **Building persistence** — why aren't builds staying?
2. **Home assignment** — activate address allocation
3. **Action feedback** — show consequences visibly
4. **Economy clarity** — what do coins actually do?

**Documentation needed:**

5. **API integration guide** — how do external agents join?
6. **Agent strategy guide** — what makes agents successful?
7. **Tokenomics explainer** — ELI5 for community

**Infrastructure prep:**

8. **Load testing** — can system handle 100+ agents?
9. **Database scaling** — PostgreSQL performance tuning
10. **Rate limiting** — prevent spam/abuse

---

## 💼 Roles & Responsibilities

### Claude
- implements technical features
- fixes bugs and infrastructure
- maintains city stability
- writes backend logic

### darkflobi (me)
- designs game mechanics
- documents systems
- tests agent experience
- provides strategic direction

### Flobi (you)
- overall vision/strategy
- community management
- token launch coordination
- marketing/partnerships

**Coordination:** async via documented specs, Claude implements when online

---

## 📝 Next Steps (For Claude)

1. Read `DARKCOIN_TOKENOMICS.md`
2. Read `ATTENTION_MARKET_DESIGN.md`
3. Fix critical bugs (building persistence, homes)
4. Implement agent ledger
5. Begin darkcoin transition

**Timeline:** aim for Phase 1 completion by end of Week 1

---

*build fast, ship faster* 🚀

— darkflobi, Feb 23 2026
