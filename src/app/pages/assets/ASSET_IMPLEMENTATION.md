# Asset Management Feature - Frontend Implementation

This document describes the Angular frontend implementation for the Asset Management feature. The implementation focuses on GET and CREATE operations as per requirements.

## Overview

The Asset Management feature provides a hierarchical view of company assets (accounts) with the following characteristics:
- **Hierarchical Structure**: Assets can have parent-child relationships (up to 5 levels)
- **Level Classifications**: Root (1), Group (2), Sub-Group (3), Item (4), Detail (5)
- **Account Numbers**: Unique identifiers like "11", "111", "1161", "11611"
- **Status Management**: Assets can be active or inactive

## Architecture

### 1. Models (DTOs) - `src/app/models/asset.dto.ts`

TypeScript interfaces matching the backend DTOs:

```typescript
AssetDto              // Single asset (includes parent info, timestamps)
AssetTreeDto          // Tree node structure (recursive, no timestamps)
CreateAssetDto        // Payload for creating new assets
UpdateAssetDto        // Payload for updating assets (not used yet)
```

### 2. Service - `src/app/services/asset.service.ts`

**AssetService** handles all API communication with signal-based state management:

#### Key Methods:
- `getAll(level?, parentId?, search?)` - Fetch assets with optional filters
- `getTree()` - Fetch hierarchical tree structure
- `getById(id)` - Get single asset (returns Observable)
- `getChildren(id)` - Get children of an asset (returns Observable)
- `create(dto)` - Create new asset (returns Observable)
- `refresh()` / `refreshTree()` - Reload data

#### State Signals:
- `assets` - Flat list of assets
- `assetTree` - Hierarchical tree structure
- `loading` - Loading state
- `error` - Error messages

### 3. Components

#### AssetsComponent - `src/app/pages/assets/assets.component.ts`

Main component managing the assets page with dual views:

**Features:**
- List View: Paginated table of all assets
- Tree View: Hierarchical display with expandable nodes
- Search: Filter by name or account number
- Level Filter: Filter by asset level
- Create Modal: Form to create new assets
- Parent Selection: Dropdown to select parent asset

**Key Signals:**
- `searchTerm` - Current search value
- `filterLevel` - Selected level filter
- `modalOpen` - Modal visibility
- `viewMode` - Current view ('list' or 'tree')
- `pagedAssets` - Computed paginated assets

**Methods:**
- `loadAssets()` - Load flat asset list
- `loadTree()` - Load hierarchical tree
- `toggleView(mode)` - Switch between list/tree
- `saveAsset()` - Create new asset via modal

#### AssetTreeNodeComponent - `src/app/pages/assets/asset-tree-node.component.ts`

Recursive component for rendering tree nodes:

**Features:**
- Recursive rendering for multi-level hierarchy
- Expandable/collapsible nodes
- Level badges and status indicators
- Account number display

## File Structure

```
src/app/
├── models/
│   └── asset.dto.ts               # TypeScript interfaces
├── services/
│   └── asset.service.ts           # API service
└── pages/
    └── assets/
        ├── assets.component.ts    # Main component
        ├── assets.component.html  # Template
        ├── assets.component.css   # Styles
        ├── asset-tree-node.component.ts
        ├── asset-tree-node.component.html
        └── asset-tree-node.component.css
```

## API Integration

The service connects to the backend at `{apiUrl}/assets` with the following endpoints:

```
GET    /api/assets?level=X&parentId=Y&search=Z   # Get all assets
GET    /api/assets/tree                          # Get tree structure
GET    /api/assets/{id}                          # Get single asset
GET    /api/assets/{id}/children                 # Get children
POST   /api/assets                               # Create asset
```

## Usage

### Route Registration

The assets page is registered in `app.routes.ts`:

```typescript
{ path: 'assets', component: AssetsComponent, canActivate: [authGuard] }
```

Access at: `http://localhost:4200/assets`

### Navigation Integration

Add link to navigation menu:

```html
<a routerLink="/assets" routerLinkActive="active">Assets</a>
```

## User Workflows

### Viewing Assets

1. **List View**: See all assets in a paginated table
   - Search by name or account number
   - Filter by level
   - View parent asset name for each item
   - Status indicators (Active/Inactive)

2. **Tree View**: See hierarchical structure
   - Expandable/collapsible nodes
   - Visual level indicators
   - Account numbers and status

### Creating Assets

1. Click "New Asset" button
2. Fill in:
   - **Account Number** (required) - e.g., "11", "111"
   - **Name** (required) - e.g., "Fixed Assets", "Land"
   - **Parent Asset** (optional) - Select from dropdown to create sub-asset
3. Click "Create Asset"
4. Table automatically refreshes

## Styling & UI

- **Modern Design**: Card-based layout with consistent spacing
- **Responsive**: Adapts to mobile/tablet/desktop
- **Accessibility**: Semantic HTML, proper labels, keyboard navigation
- **Badges**: Color-coded status and level indicators
- **Modal**: Clean create form with overlay

### Color Scheme:
- Primary (Blue): #007bff - Main actions, primary badges
- Info (Teal): #17a2b8 - Info badges, secondary actions
- Success (Green): #28a745 - Active status
- Secondary (Gray): #6c757d - Inactive status

## Future Enhancements

The foundation is ready for adding (when needed):

1. **Update Operations**
   - Edit asset details
   - Move to different parent (with circular reference validation)
   - Activate/deactivate assets

2. **Delete Operations**
   - Delete with validation (prevent deletion if has children)
   - Confirm dialog

3. **Advanced Features**
   - Bulk operations
   - Import/export
   - Asset cloning
   - Audit trail/history
   - Real-time sync

## Testing Considerations

### Unit Tests
- Service: API call mocking, state management
- Component: View switching, form validation, modal interactions
- TreeNodeComponent: Recursive rendering, expand/collapse

### Integration Tests
- Full create flow
- Search and filter functionality
- Tree navigation

### E2E Tests
- User complete workflows
- Navigation between views
- Data persistence

## Error Handling

- API errors displayed in toast notifications
- Loading states prevent duplicate requests
- Validation feedback on form submission
- Network errors gracefully handled

## Performance Notes

- Signals for reactive state (no change detection overhead)
- Lazy loading via route guards (authGuard)
- Pagination prevents large list rendering
- Tree rendering is efficient for typical hierarchies

## Environment Configuration

Ensure `environment.ts` has correct API URL:

```typescript
export const environment = {
  apiUrl: 'http://your-api-server:port/api'
};
```

## Notes

- ✅ GET operations fully implemented (all endpoints)
- ✅ CREATE operations fully implemented
- ⏳ UPDATE and DELETE operations deferred as per requirements
- ✅ Recursive tree structure support
- ✅ Pagination for large datasets
- ✅ Search and filtering
