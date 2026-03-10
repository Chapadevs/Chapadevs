---
name: Fix Workspace Collaboration Gaps
overview: "Address the identified collaboration gaps between Client and Programmer: pending approvals banner, timeline confirmation notification, image/attachment upload and display (priority), request changes feedback, waiting-on-client notification, and empty cycle actions state. Deliverables display removed (current steps/cards already cover task visibility). Sub-step assignment via drag remains unchanged."
todos: []
isProject: false
---

# Fix Workspace Collaboration Gaps

## Scope

Address the collaboration gaps identified in the review, excluding auto-assignment (programmer assignment on card drag stays as-is). Low-priority items (client-initiated questions, progress on cycle tabs) are deferred.

**Clarifications:**

- **Deliverables vs current steps:** The task cards (sub-steps) like "Feature Prioritization & Scope Definition" are the current steps already visible. Phase-level "deliverables" (e.g. "Requirements doc", "Wireframes") are a separate field used by AI generation. Deliverables display is **removed** from this plan since the current steps already provide task visibility.
- **Images/attachments:** Upload, storage, and display of images must be a core part of the workflow—storing correctly and displaying in the right place is critical.

---

## 1. Pending Approvals Strip (High)

**Problem:** `showPendingApprovalsStrip` is computed but never rendered; the Client has no visible cue when phases need approval.

**Solution:** Render a banner in [Workspace.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/Workspace.jsx) when `showPendingApprovalsStrip` is true.

**Changes:**

- In the main Workspace return (around line 539, before the cycle tabs), add a conditional block:
  - If `showPendingApprovalsStrip`, render an `Alert` (variant `warning`) with message like: "You have {pendingApprovals.length} phase(s) awaiting your approval. Review and approve in the cycle below."
  - Use design tokens per `.cursor/rules/design-pattern.mdc` (no new CSS).

---

## 2. Timeline Confirmed Notification (High)

**Problem:** When the Programmer confirms the timeline (`confirmPhases`), the Client is not notified.

**Solution:** Call `createNotification` for the Client after phases are created in [projectController.js](backend/controllers/projectController.js).

**Changes:**

- In `confirmPhases`, after `ProjectPhase.insertMany` and `logProjectActivity` (around line 657), add:
  - If `project.clientId` exists, call `createNotification(project.clientId, 'project_updated', 'Timeline Ready', 'The project timeline has been created. Please review the phases in the Workspace.', projectId)`
- Use `project._id` for projectId; ensure `clientId` is the ObjectId ref (not populated).

---

## 3. Image/Attachment Upload and Display (High - Critical)

**Problem:** Attachments (especially images) are essential for development but are not visible in the Workspace. `AttachmentManager` exists but is not integrated, and images are shown only as an icon—not as thumbnails. Storage works (multer, `/uploads/phases/`); display and placement do not.

**Solution:** Integrate attachments prominently in CycleDetail and enhance AttachmentManager so images are stored correctly and displayed as thumbnails in the right place.

**Changes:**

**A. Integrate AttachmentManager in CycleDetail**

- In [CycleDetail.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/CycleDetail.jsx):
  - Import `AttachmentManager` from `./AttachmentManager`
  - Add section "Attachments" (same panel style as Current step, Cycle actions) inside `phase-cycle-left`, after `phase-cycle-actions`
  - Render: `<AttachmentManager phase={localPhase} project={project} canUpload={canUploadAttachments} isProgrammerOrAdmin={isProgrammerOrAdmin} userId={userId} onUpdate={(updated) => { setLocalPhase(updated); onUpdate?.(updated) }} />`

**B. Enhance AttachmentManager for image display**

- In [AttachmentManager.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/AttachmentManager.jsx):
  - Add `accept="image/*,.pdf,.doc,.docx"` to the file input so images are explicitly supported (or `accept="*/*"` if all files should be allowed)
  - For attachments where `attachment.type` includes `'image'`: render an inline thumbnail (`<img src={getFileUrl(attachment.url)} alt={attachment.filename} className="..." />`) instead of only the icon; keep filename and actions below. Use Tailwind (e.g. `max-h-24 object-cover rounded-none`) per design system.
  - Non-image files: keep current layout (icon + filename + Download/Delete)
  - Ensure `getFileUrl` produces a valid URL for the backend (e.g. `VITE_BACKEND_URL` + `/uploads/phases/...` or similar)
- Optionally: group attachments by type (images first, then other files) for clearer layout

**Note:** Attachments are phase-level. If images need to be attached per task (sub-step) in the future, a schema change would be required (add `attachments` to subSteps in ProjectPhase).

---

## 4. Request Changes Feedback (Medium)

**Problem:** When the Client clicks "Request Changes", no feedback is captured; the Programmer does not know why.

**Solution:** Add optional feedback field and store it; notify Programmer with the feedback.

**Backend:**

- [ProjectPhase.js](backend/models/ProjectPhase.js): Add `clientApprovalFeedback: { type: String, default: null }` after `clientApprovedAt`.
- [projectController.js](backend/controllers/projectController.js) `approvePhase`:
  - Accept `feedback` from `req.body` when `approved === false`.
  - Set `phase.clientApprovalFeedback = feedback || null` when rejecting; clear it when approving.
  - When `approved === false` and `project.assignedProgrammerId` exists, call `createNotification` with message including feedback: e.g. "The client requested changes on phase {title}. Feedback: {feedback or 'No feedback provided'}."
  - Notify all programmers in `assignedProgrammerIds` if present (loop over team); else notify `assignedProgrammerId`.

**Frontend:**

- [projectApi.js](frontend/src/services/projectApi.js): Update `approvePhase(projectId, phaseId, approved, feedback)` to send `{ approved, feedback }` in the body.
- [CycleDetail.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/CycleDetail.jsx): When "Request Changes" is clicked, show `window.prompt('Optional: Add feedback for the programmer')` or a small modal; pass the result to `handleApprove(false, feedback)`.
- Update `handleApprove` to accept optional feedback and pass it to `projectAPI.approvePhase`.

---

## 5. Waiting-on-Client Notification (Medium)

**Problem:** When a Programmer sets a sub-step status to `waiting_client`, the Client is not notified.

**Solution:** In `updatePhase`, detect when any sub-step's status changes to `waiting_client` and notify the Client.

**Changes in [projectController.js](backend/controllers/projectController.js) `updatePhase`:**

- Before applying `req.body.subSteps`, snapshot existing sub-steps and their statuses.
- After `phase.save()` (around line 787), compare new vs old sub-steps.
- If any sub-step changed from non-`waiting_client` to `waiting_client`, and `project.clientId` exists, call `createNotification(project.clientId, 'project_updated', 'Action Needed', 'A task is waiting on your input in phase \"{phase.title}\" for project \"{project.title}\".', projectId)`.
- Use the sub-step title in the message if easily available for clarity.

---

## 6. Empty Cycle Actions State (Low)

**Problem:** When no cycle actions are available (e.g. phase completed, nothing to approve), the "Cycle actions" section can appear empty.

**Solution:** Show a friendly fallback when the actions list is empty.

**Changes in [CycleDetail.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/CycleDetail.jsx):**

- Inside `phase-cycle-actions-list`, when none of the action buttons/notices render (i.e. `!canStartPhase && !canCompletePhase && !needsApproval && !canApprove`), render a single `<li><p className="text-ink-muted text-sm">No actions available for this cycle.</p></li>`.

---

## Implementation Order

1. Pending approvals strip (frontend only)
2. Timeline confirmed notification (backend only)
3. Image/attachment upload and display (frontend: CycleDetail integration + AttachmentManager enhancements)
4. Request changes feedback (backend + frontend)
5. Waiting-on-client notification (backend only)
6. Empty cycle actions state (frontend only)

---

## Files Touched


| File                                                                                                                       | Changes                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Workspace.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/Workspace.jsx)                            | Pending approvals banner                                                  |
| [projectController.js](backend/controllers/projectController.js)                                                           | Timeline notification, approvePhase feedback, waiting_client notification |
| [ProjectPhase.js](backend/models/ProjectPhase.js)                                                                          | clientApprovalFeedback field                                              |
| [CycleDetail.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/CycleDetail.jsx)             | AttachmentManager integration, request feedback UX, empty actions         |
| [AttachmentManager.jsx](frontend/src/pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/AttachmentManager.jsx) | Image thumbnail display, accept attribute for images                      |
| [projectApi.js](frontend/src/services/projectApi.js)                                                                       | approvePhase feedback param                                               |


---

## Out of Scope (Per User)

- Sub-step auto-assignment: programmer assignment on drag is kept as-is.
- Deliverables display: removed—current step cards already provide task visibility.
- Client-initiated questions: deferred.
- Progress on cycle tabs: deferred.

