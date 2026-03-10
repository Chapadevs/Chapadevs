/**
 * Rule-based todo generator for sub-steps when AI-generated todos are not available.
 * @param {Object} opts - { title, estimatedDurationDays, deliverables }
 * @returns {Array<{ text: string, order: number }>}
 */
export function generateSubStepTodos({
  title = "",
  estimatedDurationDays = 1,
  deliverables = [],
}) {
  const lower = (title || "").toLowerCase();
  const days = Math.max(
    1,
    Math.min(7, Math.round(Number(estimatedDurationDays) || 1)),
  );
  const count = Math.min(6, Math.max(2, Math.ceil(days * 0.8)));

  if (
    lower.includes("implement") ||
    lower.includes("build") ||
    lower.includes("develop")
  ) {
    const tasks = [
      "Setup structure and dependencies",
      "Implement core logic",
      "Add styling and polish",
      "Integration and testing",
      "Code review and refinements",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }
  if (
    lower.includes("gather") ||
    lower.includes("document") ||
    lower.includes("requirements")
  ) {
    const tasks = [
      "Schedule kickoff",
      "Document scope",
      "Define milestones",
      "Stakeholder review",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }
  if (
    lower.includes("wireframe") ||
    lower.includes("design") ||
    lower.includes("mockup")
  ) {
    const tasks = [
      "Create wireframe for main flow",
      "Review and iterate",
      "Get client approval",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }
  if (
    lower.includes("test") ||
    lower.includes("qa") ||
    lower.includes("quality")
  ) {
    const tasks = [
      "Run unit tests",
      "Integration testing",
      "Document results",
      "Fix identified issues",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }
  if (
    lower.includes("deploy") ||
    lower.includes("launch") ||
    lower.includes("handoff")
  ) {
    const tasks = [
      "Prepare production environment",
      "Deploy and verify",
      "Post-launch checklist",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }
  if (
    lower.includes("integrat") ||
    lower.includes("api") ||
    lower.includes("wiring")
  ) {
    const tasks = [
      "Configure endpoints",
      "Implement data flow",
      "Error handling and validation",
    ];
    return tasks.slice(0, count).map((text, i) => ({ text, order: i + 1 }));
  }

  const defaultTasks = [
    "Setup and planning",
    "Implementation",
    "Review and complete",
  ];
  return defaultTasks
    .slice(0, count)
    .map((text, i) => ({ text, order: i + 1 }));
}
