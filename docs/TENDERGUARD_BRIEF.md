# TENDERGUARD — Canonical Brief & Architecture Specification

## 1. Product Overview & Core Principle
- **Product Name**: TenderGuard
- **Tagline**: Autonomous, Data-Driven Procurement on MST
- **Core Principle**: *"AI analyzes. Blockchain enforces. Humans oversee."*
- **Governance Philosophy**:
  - **AI never selects a winner**: AI generates analytical recommendations, evaluates risk scores, and checks bidding pattern metrics.
  - **The smart contract enforces procurement policy**: Predefined, mathematically verifiable selection weights and escrow conditions execute deterministically on-chain.
  - **Humans oversee**: High-risk tenders trigger automated freezes requiring formal human review and auditor sign-off.

---

## 2. Wording & Terminology Rules
To ensure institutional compliance, legal defensibility, and professional standards, strictly abide by the following terminology rules across all UI components, notifications, tooltips, and documentation:

| Prohibited Terms | Required Replacement / Prescribed Phrasing |
| :--- | :--- |
| ❌ "corruption detected" / "corrupt" | ✅ **"Suspicious bidding pattern detected"** |
| ❌ "AI selected the winner" | ✅ **"Programmable procurement rule"** / **"AI recommendation. Human review required."** |
| ❌ "blockchain makes it secure" | ✅ **"Smart contract enforced"** / **"Tamper-evident record"** |
| ❌ "system decided" | ✅ **"AI-assisted risk assessment"** |
| ❌ "award stopped" | ✅ **"Tender frozen for review"** |
| ❌ "funds held" | ✅ **"Escrow controlled by contract"** / **"Performance bond locked"** |
| ❌ "money paid" | ✅ **"Milestone payment released"** |
| ❌ "vendor database" | ✅ **"On-chain supplier state"** / **"Verified Supplier Registry"** |

---

## 3. Honesty & Demonstration Rules
- **Demo Data Disclaimer**: All blockchain transactions, hashes, timestamps, and AI inference outputs are simulated demo data until live MST smart contract integration.
- **No False Claims**: Never claim live mainnet connectivity or real financial settlement.
- **MSTC Token**: MSTC is a testnet demonstration token used for escrow and performance bond mechanics, not fiat currency.
- **Risk Score Attribution**: Risk scores are computed off-chain by AI analytical models and committed on-chain for verification; the UI must explicitly reflect this distinction.

---

## 4. Design & Status Color System
Colors carry precise semantic meaning and are never used decoratively:
- **Green** (`#22C55E` / `emerald`): Verified, Completed, Milestone Released, Low Risk (0–39).
- **Amber** (`#F59E0B` / `amber`): Pending Review, In Progress, Moderate Variance / Medium Risk (40–69).
- **Red** (`#EF4444` / `rose`): High Risk (70–100), Frozen for Review, Failed Check, Penalty Imposed.
- **Blue** (`#3B82F6` / `blue`): Blockchain Active, Tamper-Evident Record, Sealed State, Processing.
- **Role Accents**: Restricted to Blue / Slate palette (`#0B1220`, `#111A2E`, `#1E2A44`, `#3B82F6`).

---

## 5. Single Source of Truth: Scoring & Selection Policy

### Weights (Must sum to exactly 100%)
1. **Price**: `35%`
2. **Supplier Reputation**: `25%`
3. **Past Performance**: `15%`
4. **On-Time Performance**: `10%`
5. **Bid Risk Score**: `10%`
6. **Experience**: `5%`

### Pure Mathematical Formulas
- **Price Score**:
  $$\text{priceScore} = \text{round}\left(100 \times \frac{\text{lowestBid}}{\text{bid}}\right)$$
- **Sub-Scores**: Every sub-score is an integer in the range $[0, 100]$.
- **Decision Score**:
  $$\text{decisionScore} = \text{round}_1\left(\frac{\sum (\text{weight}_i \times \text{subScore}_i)}{100}\right)$$
- **Risk Classification**:
  - `0 - 39`: **LOW RISK** (Standard processing)
  - `40 - 69`: **MEDIUM RISK** (Observation recommended)
  - `70 - 100`: **HIGH RISK** (Award auto-frozen for human review)

---

## 6. Seed Domain Data

### Seed Suppliers (Raw Inputs)
- **Supplier A (Apex Infra Ltd / TG-1042)**:
  - Category: `Infrastructure`
  - Wallet: `0xABCD...1234`
  - Experience: `8 yrs` (Score: 86)
  - Completed: `24` | Won: `31` | Total Contracts: `35`
  - On-Time: `96%` (Score: 96)
  - Avg Performance: `92` (Score: 92)
  - Failed: `1` | Disputes: `2` | Bonds Lost: `0`
  - Total Value: `₹4.8 Cr`
  - Reputation: `91` (Score: 91)
  - Bid Risk Score: `91` (LOW risk profile)
- **Supplier B (BuildWell Corp / TG-1077)**:
  - Category: `Infrastructure`
  - Wallet: `0xBCDE...5678`
  - Experience: `5 yrs` (Score: 60)
  - Completed: `12` | Won: `16` | Total Contracts: `19`
  - On-Time: `81%` (Score: 81)
  - Avg Performance: `78` (Score: 78)
  - Failed: `2` | Disputes: `4` | Bonds Lost: `1`
  - Total Value: `₹2.1 Cr`
  - Reputation: `72` (Score: 72)
  - Bid Risk Score: `60` (MEDIUM risk profile)
- **Supplier C (Civic Foundation Ltd / TG-1093)**:
  - Category: `Infrastructure`
  - Wallet: `0xCDEF...9012`
  - Experience: `6 yrs` (Score: 70)
  - Completed: `18` | Won: `22` | Total Contracts: `25`
  - On-Time: `90%` (Score: 90)
  - Avg Performance: `86` (Score: 86)
  - Failed: `0` | Disputes: `1` | Bonds Lost: `0`
  - Total Value: `₹3.4 Cr`
  - Reputation: `85` (Score: 85)
  - Bid Risk Score: `88` (LOW risk profile)

### Normal Tender: T001 "Municipal School Renovation"
- **Status**: `AWARDED` | **Tender Risk**: `18` (LOW)
- **Bids**:
  - Supplier A: `₹9,20,000` $\rightarrow$ Price Score: `91` $\rightarrow$ **Final Score: 91.4** (Winner)
  - Supplier B: `₹8,40,000` $\rightarrow$ Price Score: `100` $\rightarrow$ **Final Score: 81.8**
  - Supplier C: `₹8,80,000` $\rightarrow$ Price Score: `95` $\rightarrow$ **Final Score: 88.7**
- **Outcome**: Supplier A wins despite highest quote because superior reputation ($91$) and performance ($92$) outweigh price differential in policy execution.

### Suspicious Tender: T002 "Smart City Road Project"
- **Status**: `FROZEN` | **Tender Risk**: `84` (HIGH)
- **Bids**: `₹8,00,000`, `₹8,04,000`, `₹8,02,500`, `₹8,01,500`
- **Anomaly Breakdown**:
  - Bid Similarity: `+25`
  - Small Bid Spread: `+25`
  - Repeated Co-Bidding: `+20`
  - Winner Rotation: `+14`
- **Enforcement**: Smart contract auto-freezes award; flagged for auditor human review.

### Escrow Ledger for T001
- Authority Escrow: `100 MSTC`
- Winner Performance Bond: `50 MSTC`
- Bid Deposits: `40 MSTC` (refunded to non-winning bidders upon award)
- Milestones:
  - `M1`: Site Preparation — `30 MSTC` $\rightarrow$ `COMPLETED` / `RELEASED`
  - `M2`: Foundation — `20 MSTC` $\rightarrow$ `IN_PROGRESS`
  - `M3`: Final Completion — `50 MSTC` $\rightarrow$ `PENDING`
- Derived Totals:
  - Released Funds: `30 MSTC`
  - Escrow Locked: `70 MSTC`
  - Bond Locked: `50 MSTC`
  - Total Locked: `120 MSTC`
  - Funds at Risk: `0 MSTC`

---

## 7. Consistency & Architectural Rules
1. **Single Source of Truth**: All pages read entity state from the async service layer (`src/services/`). Never import raw data directly from `src/data/`.
2. **Zero Hardcoded Derived Values**: Scores, risk ratings, rankings, and escrow totals are strictly calculated via pure utility functions in `src/utils/scoring.js` and `src/utils/escrow.js`.
3. **Additive Routes**: All legacy URLs continue to function seamlessly via aliasing/redirects alongside structured role routes.

---

## 8. Build Roadmap (Subsequent Phases)
- **Phase B**: Auditor Hero Experience — Risk Analysis, AI Pattern Breakdown, and Decision Reports.
- **Phase C**: Contractor Lifecycle — Supplier Profile, Discovery, Sealed Bid Submissions, and Cryptographic Reveals.
- **Phase D**: On-Chain Execution — Blockchain Timeline, Smart Contract Escrow, Milestone Tracking, and Audit Trails.
- **Phase E**: Authority Admin — Dashboard, Tender Lifecycle Management, and Programmable Policy Builder.
- **Phase F**: Interactive Demo Mode, Testnet Wallet, and Supplier Registry.
- **Phase G**: UI Polish, Responsive Optimization, and Comprehensive QA.
