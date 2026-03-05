export function validateVars(vars) {
    const issues = [];
    for (const [k, v] of Object.entries(vars)) {
        if (!k.startsWith("--"))
            issues.push({ key: k, value: v, reason: "Key must start with --" });
        // Accept common forms
        const ok = /^oklch\(.+\)$/.test(v) ||
            /^hsl\(.+\)$/.test(v) ||
            /^rgb\(.+\)$/.test(v) ||
            /^#[0-9a-fA-F]{3,8}$/.test(v) ||
            /^[0-9.]+(rem|px|em|%)$/.test(v) || // radius etc
            /^[0-9.\s/%+-]+$/.test(v); // fallback (loose)
        if (!ok)
            issues.push({ key: k, value: v, reason: "Value format looks suspicious" });
    }
    return issues;
}
