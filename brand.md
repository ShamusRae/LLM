# Rovesg Brand Guidelines

This document defines the visual brand system for Rovesg so product UI, dashboards, and investor materials stay consistent with the logo direction.

## Brand Direction

Rovesg visual identity is **Digital-Organic**:

- premium and technical
- eco-conscious and growth-oriented
- dark, modern interface foundations with luminous accent energy

Design tone: **"Silicon Valley meets the Mediterranean"**.

## Core Color Palette

| Role | Color Name | Hex Code | Purpose |
|---|---|---|---|
| Primary/Action | Luminous Teal | `#22C5A0` | Buttons, active states, key data points |
| Secondary/Trust | Deep Neural Blue | `#0A2342` | Headers, sidebars, primary text |
| Accent/Eco | Agave Green | `#82D173` | Success states, eco-metric highlights |
| Background | Obsidian Matte | `#121619` | Main application background (dark mode) |
| Surface | Slate Gray | `#1E252B` | Cards, containers, section dividers |

## UI Application Rules

- Use **Obsidian Matte** for app/page backgrounds and **Slate Gray** for cards and grouped content.
- Use **Luminous Teal** as the primary CTA and interaction color.
- Use **Deep Neural Blue** for trust/navigation surfaces and high-importance typography.
- Use **Agave Green** for positive deltas, sustainability metrics, and success labels.
- Keep contrast high and avoid noisy backgrounds behind data.

## Interaction & Effects

- **Gradients:** Use Teal -> Green for growth/progress visuals (ROI, performance, efficiency).
- **Glow effects:** Apply subtle outer glow on primary actions to mirror the logo’s luminous feel.
- **Cards:** Prefer glassmorphism-inspired cards with restrained blur and strong edge contrast.
- **Charts:** Favor geometric/circuit/leaf-inspired motifs for data storytelling.

## Typography & Layout

- Clean sans-serif typography.
- Clear hierarchy with compact, executive-friendly spacing.
- Dense but readable dashboards suitable for decision-making contexts.

## Imagery Guidance

- Prefer high-contrast architectural/technology imagery with a cool blue-teal tint.
- Reinforce themes of AI infrastructure, sustainability, and portfolio growth.

## AI UI Mockup Prompt

Use this prompt for design generation tools:

> "A high-end, modern dashboard UI design for Rovesg, a tech incubator. Minimalist aesthetic. The color palette uses a gradient of Deep Neural Blue (#0A2342) and Luminous Teal (#22C5A0) against an Obsidian Matte (#121619) background. Features clean sans-serif typography, glassmorphism card elements, and abstract geometric data visualizations inspired by circuit-board patterns and leaf veins. The vibe is sophisticated, technical, and eco-conscious. 8k resolution, sleek UX/UI design."

## Implementation Notes

- Define these colors as CSS variables/tokens in the global theme layer.
- Use semantic tokens in components (`--color-action`, `--color-success`, etc.) rather than hardcoded hex values.
- Validate color contrast on all text and controls before release.
