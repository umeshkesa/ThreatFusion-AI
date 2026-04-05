// Convert version string → array
const parseVersion = (version) => {
  return version.split(".").map(num => parseInt(num));
};

// Compare two versions
// returns:
// 1 → v1 > v2
// -1 → v1 < v2
// 0 → equal
const compareVersions = (v1, v2) => {
  const a = parseVersion(v1);
  const b = parseVersion(v2);

  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const num1 = a[i] || 0;
    const num2 = b[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
};
const isVersionInRange = (assetVersion, range) => {
  const { min_version, min_operator, max_version, max_operator } = range;

  let minCheck = true;
  let maxCheck = true;

  if (min_version) {
    minCheck = isVersionVulnerable(assetVersion, min_version, min_operator);
  }

  if (max_version) {
    maxCheck = isVersionVulnerable(assetVersion, max_version, max_operator);
  }

  return minCheck && maxCheck;
};
// Check if asset version is vulnerable
const isVersionVulnerable = (assetVersion, vulnVersion, operator) => {
  const result = compareVersions(assetVersion, vulnVersion);

  switch (operator) {
    case "<=":
      return result <= 0;
    case "<":
      return result < 0;
    case ">=":
      return result >= 0;
    case ">":
      return result > 0;
    case "=":
      return result === 0;
    default:
      return false;
  }
};

module.exports = {
  compareVersions,
  isVersionVulnerable,
  isVersionInRange
};