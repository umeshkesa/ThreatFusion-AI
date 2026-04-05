const getPriority = (riskScore) => {
  if (riskScore >= 80) return "CRITICAL";
  if (riskScore >= 50) return "HIGH";
  if (riskScore >= 30) return "MEDIUM";
  return "LOW";
};

module.exports = getPriority;