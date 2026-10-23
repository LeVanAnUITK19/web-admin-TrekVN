# Recovery Plan for Web-Admin-TrekVN

## Problem
Git commits e8f2114 and 49bfd9f were corrupted and didn't contain package.json and other root files.
Reset back to b6cd2b6 which is the last stable commit.

## Changes to Re-apply

### 1. Map Overlays Feature
- Create `src/components/map/PlaceOfflineMapWithOverlays.tsx`
- Create `src/components/map/MapPreviewWithOverlays.tsx`
- Update `src/features/trekking/places/PlaceDetailPage.tsx` to use new overlay component

### 2. Hierarchical UI for Routes
- Update `src/features/trekking/routes/RoutesPage.tsx`:
  - Group routes by place
  - Add collapsible sections
  - Filter by ACTIVE places only

### 3. Hierarchical UI for Milestones  
- Update `src/features/trekking/milestones/MilestonesPage.tsx`:
  - 3-level hierarchy: Place → Route → Milestones
  - Filter by ACTIVE places and ACTIVE routes

## Next Steps
Re-create all changes and commit properly with force push to origin/main.
