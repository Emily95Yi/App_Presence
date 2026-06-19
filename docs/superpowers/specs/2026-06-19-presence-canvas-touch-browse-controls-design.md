# Presence Canvas Touch Browse Controls Design

## Goal

Reduce accidental card opens during touch exploration, especially while zoomed on iPad or phone, without changing the default card-opening experience.

## Selected Approach

Use the approved "A" layout:

- Add a top-right browse mode button beside the existing tool buttons.
- Keep browse mode off by default.
- When browse mode is on, tapping canvas cards does not open the card modal.
- Preserve keyword tap behavior so users can still light up words while browsing.
- Add a compact bottom forward slider for touch-first navigation.
- Improve pinch handling so a pinch gesture and its release are not mistaken for a card tap.

## Interaction Details

Browse mode is a local UI state, not persisted. The button should use the existing circular glass button style and expose a clear active state. Its accessible label should communicate the current action, such as switching between browse mode and card mode.

When browse mode is active, card taps should be ignored at the card-opening boundary. The canvas should still support drag, wheel, pinch, hover where available, and keyword taps. Existing modal navigation and calendar review behavior stay unchanged.

The forward slider appears only on touch-capable devices or narrow screens. It sits near the bottom safe area, centered, with a small translucent rail. Dragging or holding the thumb to the right increases forward motion; releasing returns it to center and lets normal inertia decay. The control should be small enough to avoid covering cards but large enough for thumb use.

Pinch zoom should suppress tap handling while two pointers are active and briefly after they end. This prevents the common "pinch release opens the nearest card" problem.

## Implementation Shape

Add DOM elements in `index.html`:

- `browseModeToggle` in the top actions.
- `forwardSlider` as a bottom canvas control.

Extend `src/main.js` state with:

- `browseMode`
- `pinchSuppressTapUntil`
- `forwardControlValue`
- pointer bookkeeping for the slider

Route all card opening through the existing `handleTap` path. Add the browse-mode and pinch-suppression guards before `openCardExperience`.

Feed the forward slider into the existing camera velocity system by adding a small per-frame contribution to `state.scrollAccum` or `state.targetVel.z`, matching the current wheel/pinch movement direction.

Add CSS in `src/styles.css` using existing glass button and safe-area patterns. Avoid large controls and keep the slider hidden on pointer-only desktop unless the viewport is narrow.

## Testing

Add focused tests for interaction policy if practical by extracting pure helpers for:

- whether a card tap may open in the current mode
- whether tap suppression is active after pinch
- mapping slider value to forward velocity

Run the existing test suite and a production build. Manually verify touch-sized behavior in the browser with desktop and mobile viewports:

- default mode still opens cards
- browse mode does not open cards
- keywords still respond in browse mode
- pinch release does not open a card
- the forward slider moves the canvas forward and returns to neutral
