# Design System Specification: Editorial Precision for Wellness

## 1. Overview & Creative North Star: "The Digital Curator"

This design system moves away from the cluttered, high-anxiety aesthetic of traditional fitness trackers. Instead, it adopts the **Creative North Star of "The Digital Curator."** 

The experience should feel like a high-end, bespoke journal or a premium editorial piece—think *Kinfolk* meets *Apple Health*. We achieve this by prioritizing "Negative Space as a Feature." We break the "template" look through intentional asymmetry, where data visualizations are offset to create a rhythmic flow, and high-contrast typography scales that elevate simple calorie counts into meaningful insights. Every pixel must feel intentional, calm, and hyper-precise.

---

## 2. Color & Surface Architecture

Our palette is rooted in organic neutrals and clinical precision. We use a "Tonal-First" approach to define boundaries rather than lines.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts. Use `surface-container-low` (#f1f4f5) sections sitting on a `background` (#f8f9fa) to create structural definition.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine, heavy-weight paper.
*   **Base:** `background` (#f8f9fa)
*   **Secondary Sections:** `surface-container-low` (#f1f4f5)
*   **Primary Interactive Cards:** `surface-container-lowest` (#ffffff)
*   **Floating/Elevated Elements:** `surface-bright` (#f8f9fa)

### The "Glass & Gradient" Rule
To move beyond a "standard" flat UI, use Glassmorphism for floating action buttons or navigation overlays. 
*   **Token:** Use `surface` colors at 70% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** For primary CTAs (e.g., "Log Meal"), use a subtle linear gradient transitioning from `primary` (#126c4a) to `primary_dim` (#006040) at a 135-degree angle. This adds "soul" and depth that flat hex codes lack.

---

## 3. Typography: The Editorial Voice

We utilize **Inter** to bridge the gap between technical precision and human readability.

*   **Display (The Statement):** `display-lg` (3.5rem) and `display-md` (2.75rem) are reserved for daily summaries. These should be tracked slightly tighter (-2%) to feel like a premium headline.
*   **Headline (The Context):** `headline-sm` (1.5rem) introduces meal categories. Use a semi-bold weight to create an authoritative anchor on the page.
*   **Body (The Information):** `body-lg` (1rem) is our workhorse. Ensure a line height of at least 1.5 to maintain the "calm" personality.
*   **Labels (The Metadata):** `label-md` (0.75rem) in `on_surface_variant` (#5a6062) should be used for nutritional units (e.g., "kcal", "g").

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "software-heavy" for this brand. We lean into environmental lighting.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card (#ffffff) placed on a `surface-container-low` (#f1f4f5) background creates a soft, natural lift.
*   **Ambient Shadows:** If a floating effect is required (e.g., a modal), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(45, 51, 53, 0.06);`. The shadow color is a tinted version of `on-surface` (#2d3335), never pure black.
*   **The "Ghost Border" Fallback:** For high-density data where separation is critical, use the `outline_variant` (#adb3b5) at **15% opacity**. 100% opaque borders are forbidden.

---

## 5. Components

### Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Execution:** Separate list items using `spacing-4` (1rem) of vertical white space or by alternating background tints between `surface-container-lowest` and `surface-container-low`.
*   **Rounding:** Apply `rounded-lg` (2rem) for major cards and `rounded-md` (1.5rem) for inner nested elements to maintain a soft, approachable feel.

### Input Fields
*   **Base:** No borders. Use `surface-container-highest` (#dee3e6) as the fill color.
*   **State:** On focus, transition the background to `surface-container-lowest` (#ffffff) with a "Ghost Border" of `primary` (#126c4a) at 20% opacity.

### Buttons
*   **Primary:** `primary` (#126c4a) background with `on_primary` (#e6ffee) text. Use `rounded-full` for a friendly, modern feel.
*   **Secondary:** `surface-container-high` (#e5e9eb) background. No border.
*   **Tertiary:** Text-only, using `primary` (#126c4a) in semi-bold.

### The "Macro-Bar" (Custom Component)
A data-heavy bar chart for protein/carbs/fats.
*   **Container:** `surface-container-high` (#e5e9eb) with `rounded-full`.
*   **Progress:** Use `primary` (#126c4a) for health goals and `tertiary` (#a73b19) for "limit exceeded" warnings.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts (e.g., a large "Today" summary offset to the left with empty space on the right).
*   **Do** use `secondary_container` (#92f7c3) for success states; it’s softer and more "organic" than standard lime green.
*   **Do** leverage `spacing-12` (3rem) and `spacing-16` (4rem) to separate major sections. "Let the data breathe."

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#2d3335) to keep the contrast "soft-premium."
*   **Don't** use standard Material Design "Card" shadows. They feel too generic for this editorial aesthetic.
*   **Don't** cram multiple data points into one row. Use vertical stacking and typography scale to guide the eye.