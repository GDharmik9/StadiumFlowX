# ACCESSIBILITY.md — StadiumFlow Accessibility Commitment

## Overview
StadiumFlow is designed to be accessible to all stadium fans, including those using assistive technologies. We follow WCAG 2.1 Level AA guidelines where applicable within the React Native / WebView architecture.

## Implemented Accessibility Features

### Semantic Roles
All interactive elements use proper `accessibilityRole` attributes:
- **Buttons**: `accessibilityRole="button"` on all `TouchableOpacity` elements
- **Headers**: `accessibilityRole="header"` on all section titles
- **Alerts**: `accessibilityRole="alert"` on toast notifications and congestion warnings
- **Tabs**: `accessibilityRole="tab"` and `accessibilityRole="tablist"` on the floor level selector
- **Progress**: `accessibilityRole="progressbar"` on loading states

### Labels & Hints
- Every interactive element has a descriptive `accessibilityLabel`
- Navigation buttons include `accessibilityHint` explaining the action's result
- Decorative elements (emoji icons) use `accessibilityElementsHidden={true}`
- Complex components have compound labels (e.g., "Congestion warning at Washroom East. Estimated wait time: 18 minutes.")

### State Management
- Toggle states communicated via `accessibilityState={{ selected: true/false }}`
- Disabled buttons announce `accessibilityState={{ disabled: true }}`
- Loading states use `ActivityIndicator` with proper labels

### Live Regions
- Toast notifications use `accessibilityLiveRegion="assertive"` for immediate announcement
- Traffic status bar uses `accessibilityLiveRegion="polite"` for non-intrusive updates

### Touch Targets
All interactive elements meet minimum touch target sizes:
- Buttons: minimum 48px height (`minHeight: 48`)
- Navigation controls: minimum 44px (`minHeight: 44`)
- FAB (Floating Action Button): 50x50px

### Color & Contrast
- Congestion status uses both color AND text labels:
  - 🟢 Green + "Vacant: Clear Area"
  - 🟠 Orange + "Busy: Standard Wait time"
  - 🔴 Red + "Critical Congestion"
- White text on colored backgrounds maintains >4.5:1 contrast ratio
- Status badges provide text redundancy for color-blind users

### Haptic Feedback
- Vibration patterns on congestion alerts provide non-visual feedback
- Pattern: `[100, 500, 100, 500]` for urgent warnings
- Single vibration for navigation confirmations

### Map Accessibility
- Map container has `aria-label="3D Stadium Map with live crowd data"`
- iframe includes `title` attribute for screen readers
- Hotspot interactions bridge through to accessible React Native overlays
- All map interaction results (zone info, rerouting) appear in accessible native UI panels

## Known Limitations
- MapLibre GL JS canvas is not fully accessible to screen readers (industry-standard limitation)
- Mitigated by surfacing all actionable information in native React Native overlays
- Real-time crowd agent positions are visual-only (non-interactive decorative elements)

## Testing
- Tested with VoiceOver (iOS) accessibility semantics via React Native bridge
- Touch target sizes verified against WCAG 2.1 Success Criterion 2.5.5
- Color contrast ratios validated for all status indicators
