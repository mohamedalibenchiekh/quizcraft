export const buildAdaptiveQuiz = (result) => {
  if (!result?.adaptiveVariantId || !Array.isArray(result.adaptiveQuestions)) return null;

  const type = result.adaptiveVariant?.type || result.status;
  const isRemediation = type === 'remediation';

  return {
    _id: result.adaptiveVariantId,
    title: isRemediation ? 'Adaptive Remediation' : 'Adaptive Enrichment',
    description: isRemediation
      ? 'A focused review set tailored to the questions you missed.'
      : 'An advanced challenge set tailored to your mastery.',
    questions: result.adaptiveQuestions,
  };
};
